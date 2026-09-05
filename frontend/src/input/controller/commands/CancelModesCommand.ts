import type { IKeyCommand, InputContext } from '../IKeyCommand';

export class CancelModesCommand implements IKeyCommand {
  public canExecute(code: string, _context: InputContext): boolean {
    return code === 'Escape';
  }

  public execute(_code: string, context: InputContext, isKeyDown: boolean, e?: KeyboardEvent): void {
    if (!isKeyDown) return;
    e?.preventDefault();
    context.onCancelModes?.();
  }
}
