import useMessengerContext from '../../context/messengerContext';
import ContextMenu from './_ContextMenu';

export default function GlobalContextMenu() {
  const ctx = useMessengerContext();

  if (!ctx.ctxMenu || !ctx.ctxMenu.show) {
    return null;
  }

  return (
    <ContextMenu
      show={ctx.ctxMenu.show}
      x={ctx.ctxMenu.x}
      y={ctx.ctxMenu.y}
      items={ctx.ctxMenu.items}
      onClose={() => {
        if (ctx.closeContextMenu) {
          ctx.closeContextMenu();
        } else if (ctx.setCtxMenu) {
          ctx.setCtxMenu((prev: any) => ({ ...prev, show: false }));
        }
      }}
    />
  );
}