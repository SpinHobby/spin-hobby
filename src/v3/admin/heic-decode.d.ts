declare module "heic-decode" {
  const decode: (input: {
    buffer: Uint8Array | ArrayBuffer;
  }) => Promise<{ width: number; height: number; data: Uint8ClampedArray | Uint8Array }>;
  export default decode;
}
