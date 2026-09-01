import type { IKeyCommand, InputContext } from './IKeyCommand';

export class KeyActionRegistry {
  private commands: IKeyCommand[] = [];

  public register(command: IKeyCommand): void {
    this.commands.push(command);
  }

  public dispatch(code: string, context: InputContext, isKeyDown: boolean, e?: KeyboardEvent): boolean {
    for (const cmd of this.commands) {
      if (cmd.canExecute(code, context)) {
        cmd.execute(code, context, isKeyDown, e);
        return true;
      }
    }
    return false;
  }
}
