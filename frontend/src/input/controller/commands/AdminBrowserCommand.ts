import type { IKeyCommand, InputContext } from '../IKeyCommand';

export class AdminBrowserCommand implements IKeyCommand {
  public canExecute(code: string, _context: InputContext): boolean {
    return code === 'KeyU';
  }

  public execute(_code: string, context: InputContext, isKeyDown: boolean, e?: KeyboardEvent): void {
    if (!isKeyDown) return;
    e?.preventDefault();
    context.onOpenItemBrowser?.();
  }
}
