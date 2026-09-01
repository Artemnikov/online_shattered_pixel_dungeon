import type { IKeyCommand, InputContext } from '../IKeyCommand';

export class TalentsToggleCommand implements IKeyCommand {
  public canExecute(code: string, _context: InputContext): boolean {
    return code === 'KeyT';
  }

  public execute(_code: string, context: InputContext, isKeyDown: boolean): void {
    if (!isKeyDown) return;
    context.onOpenTalents?.();
  }
}
