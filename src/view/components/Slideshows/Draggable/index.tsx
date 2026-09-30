import React, { useState, useRef, MouseEvent, TouchEvent } from "react";

// THIS COMPONENT IS UNDER CONSTRUCTION!

export function Draggable() {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [refPoint, setRefPoint] = useState<number>(0);

  const itemList = useRef<HTMLUListElement>(null);

  if (itemList.current) {
    itemList.current.scrollLeft = 150;
  }

  function startDragging(clientX: number) {
    setIsDragging(true);
    setRefPoint(clientX);
  }

  function endDragging(_clientX: number) {
    setIsDragging(false);
  }

  function drag(clientX: number) {
    if (!(isDragging && itemList.current)) return;
    itemList.current.scrollLeft = refPoint - clientX;
  }

  function getTouchClientX(e: TouchEvent<HTMLDivElement>) {
    return e.touches[0].clientX;
  }

  function getMouseClientX(e: MouseEvent<HTMLDivElement>) {
    return e.clientX;
  }

  return (
    <div
      className="slideshow-draggable"
      onMouseDown={(e) => startDragging(getMouseClientX(e))}
      onTouchStart={(e) => startDragging(getTouchClientX(e))}
      onMouseLeave={(e) => endDragging(getMouseClientX(e))}
      onMouseUp={(e) => endDragging(getMouseClientX(e))}
      onTouchEnd={(e) => endDragging(getTouchClientX(e))}
      onMouseMove={(e) => drag(getMouseClientX(e))}
      onTouchMove={(e) => drag(getTouchClientX(e))}
    >
      <h1>Slide</h1>
      <div className="wrapper">
        <ul ref={itemList} className="items" style={{ offset: "100px 40px" }}>
          <li className="slideshow-draggable-item">0</li>
          <li className="slideshow-draggable-item">1</li>
          <li className="slideshow-draggable-item">2</li>
          <li className="slideshow-draggable-item">3</li>
          <li className="slideshow-draggable-item">4</li>
          <li className="slideshow-draggable-item">5</li>
          <li className="slideshow-draggable-item">6</li>
          <li className="slideshow-draggable-item">7</li>
          <li className="slideshow-draggable-item">8</li>
          <li className="slideshow-draggable-item">9</li>
        </ul>
      </div>
    </div>
  );
}
