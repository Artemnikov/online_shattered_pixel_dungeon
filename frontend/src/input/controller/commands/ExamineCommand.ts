import type { IKeyCommand, InputContext } from '../IKeyCommand';

export class ExamineCommand implements IKeyCommand {
  public canExecute(code: string, _context: InputContext): boolean {
    return code === 'KeyE';
  }

  public execute(_code: string, context: InputContext, isKeyDown: boolean): void {
    if (!isKeyDown) return;
    context.onExamineOrReveal?.();
  }
}
