import React, { useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useModalSelector } from "../../selectors";
import { EModal } from "../../ts";
import { hideModal } from "../../reducers";
import Settings from "./Settings";
import ReactDOM from "react-dom";
import Announcement from "./Announcement";
import { GrClose } from "react-icons/gr";

export default function Modal() {
  const mode = useModalSelector();
  if (!mode) return null;
  return <TrueModal mode={mode} />;
}

function TrueModal({ mode }: { mode: EModal }) {
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    document.addEventListener("mousedown", handleClick);
    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) dispatch(hideModal());
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [ref, dispatch]);

  function getModalContent() {
    switch (mode) {
      case EModal.SETTINGS:
        return <Settings />;
      case EModal.ANNOUNCEMENT:
        return <Announcement />;

      default:
        return null;
    }
  }

  return ReactDOM.createPortal(
    <div className="modal-background fade-in">
      <div className="modal" ref={ref}>
        <div className="modal-close" onClick={() => dispatch(hideModal())}>
          <span>Close</span>
          <div className="modal-close-icon">
            <GrClose size={18} />
          </div>
        </div>
        {getModalContent()}
      </div>
    </div>,
    document.body
  );
}
