"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// An ask's body in a list: cut at 4 lines, with "more" (to the ask's page) only when something was cut.
export function ClampedBody({ href, text, className = "ak-body" }: { href: string; text: string; className?: string }) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [isCut, setIsCut] = useState(false);
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => setIsCut(body.scrollHeight > body.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [text]);
  return (
    <>
      <p ref={bodyRef} className={`${className} ak-clamp`}>
        <Link href={href}>{text}</Link>
      </p>
      {isCut ? (
        <Link className="ak-more" href={href}>
          more<span className="fh-sr"> of this ask</span>
        </Link>
      ) : null}
    </>
  );
}
