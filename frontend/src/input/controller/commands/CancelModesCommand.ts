import type { IKeyCommand, InputContext } from '../IKeyCommand';

export class CancelModesCommand implements IKeyCommand {
  public canExecute(code: string, _context: InputContext): boolean {
    return code === 'Escape';
  }

  public execute(_code: string, context: InputContext, isKeyDown: boolean): void {
    if (!isKeyDown) return;
    if (context.gameMenuOpenRef?.current) return;
    context.onCancelModes?.();
  }
}
