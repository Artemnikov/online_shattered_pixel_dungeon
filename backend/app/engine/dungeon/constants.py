class TileType:
    VOID = 0
    WALL = 1
    FLOOR = 2
    DOOR = 3
    STAIRS_UP = 4
    STAIRS_DOWN = 5
    FLOOR_WOOD = 6
    FLOOR_WATER = 7
    FLOOR_COBBLE = 8
    FLOOR_GRASS = 9
    LOCKED_DOOR = 10
    WALL_TOP    = 11  # Exposed face to the south (floor below)
    WALL_LEFT   = 12  # Exposed face to the east (floor to the right)
    WALL_RIGHT  = 13  # Exposed face to the west (floor to the left)
    WALL_BOTTOM = 14  # Exposed face to the north (floor above)


class RoomKind:
    STANDARD = "standard"
    SPECIAL = "special"
    HIDDEN = "hidden"


class TrapType:
    WORN_DART = "worn_dart"
