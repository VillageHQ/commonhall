/* eslint-disable @next/next/no-img-element -- the tour's stand-in for next/image is a plain picture */
import type { ImgHTMLAttributes } from "react";

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string; priority?: boolean; fill?: boolean; unoptimized?: boolean };

export default function Image({ priority: _priority, fill: _fill, unoptimized: _unoptimized, alt, ...rest }: ImageProps) {
  return <img alt={alt} {...rest} />;
}
