import { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";

// Lets a page put its own buttons in the app header bar (the GNOME place for
// page actions) without the header knowing about pages: the header renders a
// <HeaderSlotTarget>, and pages portal into it with <HeaderActions>.
const HeaderSlotContext = createContext(null);

export const HeaderSlotProvider = ({ children }) => {
  const slot = useState(null);
  return <HeaderSlotContext.Provider value={slot}>{children}</HeaderSlotContext.Provider>;
};

export const HeaderSlotTarget = ({ className }) => {
  const [, setNode] = useContext(HeaderSlotContext);
  return <div ref={setNode} className={className} />;
};

export const HeaderActions = ({ children }) => {
  const [node] = useContext(HeaderSlotContext) ?? [];
  return node ? createPortal(children, node) : null;
};
