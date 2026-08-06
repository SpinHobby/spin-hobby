import React, { useState } from "react";
import "./imageSlider.scss";

export default function ImageSlider() {
  const imageSource = [
    "https://drive.google.com/uc?id=1GyPJxF36hlp2JS7SeYrnW0Bmuc9KJyBq",
    "https://drive.google.com/uc?id=1MIbogRkUdngQXnaXT8Mufup-7CScTNRj",
    "https://drive.google.com/uc?id=1a_w8OcDV-IA5UMz7usKtO_lXf0YSee3u",
    "https://drive.google.com/uc?id=1gLp3gryMbGYpgAfAtnDGccME1lCzEyUU",
    "https://drive.google.com/uc?id=1iOOVa8mOrESI0o5o7au7nAOlPFAwbnLM",
  ];

  return <Previewer imageSource={imageSource} />;
}

export function Previewer({ imageSource }: { imageSource: string[] }) {
  const [imageIndex, setImageIndex] = useState(0);

  const fPrevious = () => {
    const currentIndex =
      imageIndex <= 0 ? imageSource.length - 1 : imageIndex - 1;

    setImageIndex(currentIndex);
  };

  const fNext = () => {
    const currentIndex =
      imageIndex >= imageSource.length - 1 ? 0 : imageIndex + 1;

    setImageIndex(currentIndex);
  };

  const fPreviewerItemClicked = (index: number) => {
    setImageIndex(index);
  };

  return (
    <div className={`previewer`}>
      <div className="previewerMain">
        <button className={"previewerBtn"} onClick={fPrevious}>
          +
        </button>
        <img className="previewerImg" src={imageSource[imageIndex]} alt="" />
        <button className={"previewerBtn"} onClick={fNext}>
          -
        </button>
      </div>

      <div className="previewerPlaylist">
        {imageSource.map((item, index) => (
          <div
            className={`previewerItem ${
              imageIndex === index ? "previewerItemSelected" : null
            }`}
            onClick={() => fPreviewerItemClicked(index)}
            key={index}
          >
            <img src={item} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}
