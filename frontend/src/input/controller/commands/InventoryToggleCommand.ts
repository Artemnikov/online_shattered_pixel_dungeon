import type { IKeyCommand, InputContext } from '../IKeyCommand';

export class InventoryToggleCommand implements IKeyCommand {
  public canExecute(code: string, _context: InputContext): boolean {
    return code === 'KeyF';
  }

  public execute(_code: string, context: InputContext, isKeyDown: boolean): void {
    if (!isKeyDown) return;
    context.setShowInventory?.(prev => !prev);
  }
}
