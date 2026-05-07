"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const BarcodeScannerComponent = dynamic(
  () => import("react-qr-barcode-scanner").then((mod) => mod.BarcodeScannerComponent),
  { ssr: false }
);

const QRScanner = ({ onScan }) => {
  const [data, setData] = useState("No result");

  return (
    <div className="qr-scanner flex flex-col items-center">
      <BarcodeScannerComponent
        width={400}
        height={400}
        onUpdate={(err, result) => {
          if (result) {
            const text = result.text.trim();
            setData(text);
            if (onScan) onScan(text);
          }
        }}
      />
      <p className="mt-3 text-sm text-gray-200">
        {data === "No result" ? "Align QR within frame" : `Scanned: ${data}`}
      </p>
    </div>
  );
};

export default QRScanner;
