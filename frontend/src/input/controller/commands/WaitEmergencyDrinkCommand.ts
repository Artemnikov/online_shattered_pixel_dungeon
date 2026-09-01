import type { IKeyCommand, InputContext } from '../IKeyCommand';

export class WaitEmergencyDrinkCommand implements IKeyCommand {
  public canExecute(code: string, _context: InputContext): boolean {
    return code === 'Space';
  }

  public execute(_code: string, context: InputContext, isKeyDown: boolean, e?: KeyboardEvent): void {
    if (!isKeyDown) return;
    e?.preventDefault();
    if (context.emergencyDrinkItem && context.onEmergencyDrink) {
      context.onEmergencyDrink(context.emergencyDrinkItem);
    } else if (context.triggerWait) {
      context.triggerWait();
    }
  }
}
