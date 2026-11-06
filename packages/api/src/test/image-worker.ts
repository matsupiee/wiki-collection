import { serveCardImage } from "../shared/card/serve-image";

// 画像のストリームを本番と同じ workerd 内で扱う結合テスト用のエントリーポイント。
export default {
  fetch(request: Request, env: { CARD_IMAGES: R2Bucket }) {
    return serveCardImage(request, env.CARD_IMAGES);
  },
};
