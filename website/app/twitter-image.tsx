import {
  createSocialImage,
  socialImageAlt,
  socialImageContentType,
  socialImageSize,
} from "@/lib/social-image";

export const alt = socialImageAlt;
export const size = socialImageSize;
export const contentType = socialImageContentType;

export default function TwitterImage() {
  return createSocialImage();
}
