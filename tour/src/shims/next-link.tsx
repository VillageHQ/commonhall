"use client";

import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";

import { setTourAddress } from "./next-navigation";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string | { pathname?: string }; prefetch?: boolean; replace?: boolean; scroll?: boolean; children?: ReactNode };

// The tour's stand-in for `next/link`: a plain link whose click moves the tour's own address.
const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ href, prefetch: _prefetch, replace: _replace, scroll: _scroll, onClick, ...rest }, ref) {
  const target = typeof href === "string" ? href : (href.pathname ?? "/");
  return (
    <a
      ref={ref}
      href={target}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        setTourAddress(target);
      }}
      {...rest}
    />
  );
});

export default Link;
