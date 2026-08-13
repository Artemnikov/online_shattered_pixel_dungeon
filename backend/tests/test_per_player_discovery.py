"""Per-player potion/scroll discovery: masking is per-viewer, and PICKUP/DROP
events never leak the raw type name to a player who hasn't discovered it."""
from app.engine.entities.base import Position, Action
from app.engine.entities.items_potions import HealthPotion
from app.engine.manager import GameInstance


def test_starting_consumables_discovered_personally():
    g = GameInstance("sp1")
    p = g.add_player("p1", "Bob")
    assert "scroll_of_identify" in p.discovered_kinds
    assert "scroll_of_identify" in g.identified_kinds


def test_snapshot_masked_per_viewer():
    g = GameInstance("sn1")
    a = g.add_player("p1", "A")
    g.add_player("p2", "B")
    a.add_to_inventory(HealthPotion(id="h1"))
    g.execute_item_action("p1", "h1", Action.DRINK)
    # Party mechanics stay party-shared; only the drinker personally knows it.
    assert "health_potion" in g.identified_kinds
    assert "health_potion" in a.discovered_kinds
    assert "health_potion" not in g.players["p2"].discovered_kinds

    a.add_to_inventory(HealthPotion(id="h2"))
    for_a = next(p for p in g.get_state("p1")["players"] if p["id"] == "p1")
    for_b = next(p for p in g.get_state("p2")["players"] if p["id"] == "p1")
    pot_a = next(i for i in for_a["belongings"]["backpack"]["items"] if i["id"] == "h2")
    pot_b = next(i for i in for_b["belongings"]["backpack"]["items"] if i["id"] == "h2")
    assert pot_a["kind"] == "health_potion"
    assert pot_a["name"] == "Health Potion"
    assert pot_b["kind"] == "potion"          # subtype collapsed for B
    assert pot_b["name"] != "Health Potion"   # scrambled label for B
    assert "effect" not in pot_b
    assert "discovered_kinds" not in for_b    # personal knowledge never sent


def _place_floor_item(g, iid):
    a = g.players["p1"]
    pot = HealthPotion(id=iid)
    pot.pos = Position(x=a.pos.x, y=a.pos.y)
    g._get_or_create_floor(a.floor_id).items[pot.id] = pot


def test_pickup_event_does_not_leak_type():
    g = GameInstance("pk1")
    a = g.add_player("p1", "A")
    g.add_player("p2", "B")

    _place_floor_item(g, "h1")
    g.pickup_floor_items("p1")
    events = g.flush_events()
    pick_a = next(e for e in g.filter_events_for_player(events, "p1") if e["type"] == "PICKUP")["data"]
    pick_b = next(e for e in g.filter_events_for_player(events, "p2") if e["type"] == "PICKUP")["data"]
    assert pick_a["item"] != "Health Potion" and "Potion" in pick_a["item"]
    assert pick_b["item"] == pick_a["item"]

    # After A drinks one, A's next pickup reveals the type; B stays masked.
    g.execute_item_action("p1", "h1", Action.DRINK)
    _place_floor_item(g, "h2")
    g.pickup_floor_items("p1")
    events = g.flush_events()
    pick_a = next(e for e in g.filter_events_for_player(events, "p1") if e["type"] == "PICKUP")["data"]
    pick_b = next(e for e in g.filter_events_for_player(events, "p2") if e["type"] == "PICKUP")["data"]
    assert pick_a["item"] == "Health Potion"
    assert pick_b["item"] != "Health Potion" and "Potion" in pick_b["item"]


def test_drop_event_does_not_leak_type():
    g = GameInstance("dp1")
    a = g.add_player("p1", "A")
    g.add_player("p2", "B")

    a.add_to_inventory(HealthPotion(id="h1"))
    g.execute_item_action("p1", "h1", Action.DRINK)  # A discovers the kind
    a.add_to_inventory(HealthPotion(id="h2"))
    g.execute_item_action("p1", "h2", Action.DROP)
    events = g.flush_events()
    drop_a = next(e for e in g.filter_events_for_player(events, "p1") if e["type"] == "DROP")["data"]
    drop_b = next(e for e in g.filter_events_for_player(events, "p2") if e["type"] == "DROP")["data"]
    assert drop_a["item_name"] == "Health Potion"
    assert drop_b["item_name"] != "Health Potion" and "Potion" in drop_b["item_name"]


def test_floor_item_masked_per_viewer():
    g = GameInstance("fl1")
    a = g.add_player("p1", "A")
    g.add_player("p2", "B")
    _place_floor_item(g, "h1")

    state_a = g.get_state("p1")
    state_b = g.get_state("p2")
    item_a = next(i for i in state_a["items"] if i["id"] == "h1")
    item_b = next(i for i in state_b["items"] if i["id"] == "h1")
    assert item_a["kind"] == "potion" and item_a["name"] != "Health Potion"
    assert item_b["name"] == item_a["name"]

    # Party-wide identification feeds co-op *mechanics* (recipes, shop prices),
    # but per-viewer reveals stay personal: neither hero has discovered the type.
    g.identified_kinds.add("health_potion")
    state_a = g.get_state("p1")
    state_b = g.get_state("p2")
    item_a = next(i for i in state_a["items"] if i["id"] == "h1")
    item_b = next(i for i in state_b["items"] if i["id"] == "h1")
    assert item_a["kind"] == "potion" and item_a["name"] != "Health Potion"
    assert item_b["name"] == item_a["name"]

    # Once A discovers it, A's snapshot reveals the floor item; B stays masked.
    g.players["p1"].discovered_kinds.add("health_potion")
    state_a = g.get_state("p1")
    state_b = g.get_state("p2")
    item_a = next(i for i in state_a["items"] if i["id"] == "h1")
    item_b = next(i for i in state_b["items"] if i["id"] == "h1")
    assert item_a["kind"] == "health_potion" and item_a["name"] == "Health Potion"
    assert item_b["kind"] == "potion" and item_b["name"] != "Health Potion"


def test_ranged_attack_embedded_item_masked_per_recipient():
    g = GameInstance("ra1")
    a = g.add_player("p1", "A")
    g.add_player("p2", "B")
    # Party identified the kind (mechanics), but only A personally knows it.
    g.identified_kinds.add("health_potion")
    a.discovered_kinds.add("health_potion")
    raw = g._serialize_floor_item(HealthPotion(id="h1"))
    assert raw["kind"] == "health_potion"  # unmasked at creation (party-known)

    g.events.append({"type": "RANGED_ATTACK", "data": {"item": raw}})
    events = g.flush_events()
    item_a = next(e for e in g.filter_events_for_player(events, "p1") if e["type"] == "RANGED_ATTACK")["data"]["item"]
    item_b = next(e for e in g.filter_events_for_player(events, "p2") if e["type"] == "RANGED_ATTACK")["data"]["item"]
    assert item_a["kind"] == "health_potion" and item_a["name"] == "Health Potion"
    assert item_b["kind"] == "potion" and item_b["name"] != "Health Potion"
