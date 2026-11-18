import api from "./api";
import { compressImage } from "../utils/imageCompressor";

export const mediaService = {
  async uploadMedia(file) {
    const isVideo = file?.type?.startsWith("video/");
    // Apply client-side downscaling/compression only to large images
    const processedFile = isVideo ? file : await compressImage(file);

    const formData = new FormData();
    formData.append("file", processedFile);

    // 180s for videos, 120s for images to prevent premature aborts on cloud hops
    const timeout = isVideo ? 180000 : 120000;

    const data = await api.post("/simulator/media/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout,
    });
    return data; // { url, file_id, provider }
  },
};

export default mediaService;
