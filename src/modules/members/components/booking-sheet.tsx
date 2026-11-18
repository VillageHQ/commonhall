"use client";

import { useMutation } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useFlash } from "@/components/flash";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/ui/checkbox-card";
import { Input } from "@/components/ui/input";
import { acknowledgedResponseSchema } from "@/platform/http/contract";
import { postRequest } from "@/platform/http/post-request";
import {
  BOOKING_API_ROUTE,
  BOOKING_URL_ERROR,
  BOOKING_VISIBILITIES,
  MAXIMUM_BOOKING_URL_LENGTH,
  parseBookingUrl,
  type BookingVisibility,
} from "@/modules/members/contract-community-roles";

const URL_INPUT_ID = "booking-url";

function saveBooking(body: { bookingUrl: string; bookingVisibility: BookingVisibility }) {
  return postRequest(BOOKING_API_ROUTE, body, acknowledgedResponseSchema);
}

type BookingSheetProps = { communityName: string; bookingUrl: string | null; bookingVisibility: BookingVisibility };

// My profile's "Book a call" sheet: any https booking page (Calendly, Cal.com, a Google appointment page), and who sees it.
export function BookingSheet({ communityName, bookingUrl, bookingVisibility }: BookingSheetProps) {
  const router = useRouter();
  const flash = useFlash();
  const [url, setUrl] = useState(bookingUrl ?? "");
  const [visibility, setVisibility] = useState<BookingVisibility>(bookingVisibility);
  const [localError, setLocalError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: saveBooking,
    onSuccess: ({ message }) => {
      flash(message);
      router.refresh();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const typed = url.trim();
    if (typed && !parseBookingUrl(typed)) {
      setLocalError(BOOKING_URL_ERROR);
      return;
    }
    setLocalError(null);
    save.mutate({ bookingUrl: typed, bookingVisibility: visibility });
  }

  function remove() {
    setUrl("");
    setLocalError(null);
    save.mutate({ bookingUrl: "", bookingVisibility: visibility });
  }

  const error = localError ?? save.error?.message ?? null;
  return (
    <section className="fh-sheet" id="booking" aria-labelledby="booking-title">
      <h2 id="booking-title" className="fh-h3 flex items-center gap-1.5">
        <CalendarPlus aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} /> Book a call
      </h2>
      <p className="fh-small mt-1.5">Add your booking page and members see “Book a call” on your profile.</p>
      <form onSubmit={submit} noValidate>
        <label htmlFor={URL_INPUT_ID} className="fh-label mt-3 block">
          Booking link
        </label>
        <Input
          id={URL_INPUT_ID}
          type="url"
          inputMode="url"
          className="mt-1.5"
          value={url}
          maxLength={MAXIMUM_BOOKING_URL_LENGTH}
          placeholder="https://cal.com/your-name"
          aria-invalid={localError ? true : undefined}
          onChange={(event) => setUrl(event.target.value)}
        />
        <p className="fh-label mt-3">Show it to</p>
        <div className="mt-2">
          <OptionCard
            id="booking-visibility-community"
            name="booking-visibility"
            value={BOOKING_VISIBILITIES.community}
            checked={visibility === BOOKING_VISIBILITIES.community}
            onChange={() => setVisibility(BOOKING_VISIBILITIES.community)}
            title={`Everyone in ${communityName}`}
            description="Any member can book time with you"
          />
          <OptionCard
            id="booking-visibility-introduced"
            name="booking-visibility"
            value={BOOKING_VISIBILITIES.introduced}
            checked={visibility === BOOKING_VISIBILITIES.introduced}
            onChange={() => setVisibility(BOOKING_VISIBILITIES.introduced)}
            title="Only people whose intro I accepted"
            description="Everyone else never sees the link"
          />
        </div>
        <FormError message={error} />
        <div className="fh-btn-row mt-3">
          <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
            Save booking link
          </Button>
          {bookingUrl ? (
            <Button type="button" variant="quiet" size="sm" disabled={save.isPending} onClick={remove}>
              Remove link
            </Button>
          ) : null}
        </div>
      </form>
      <p className="fh-small fh-muted mt-2.5">Admins see how many calls members asked for, and with whom.</p>
    </section>
  );
}
