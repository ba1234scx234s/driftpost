import { HeartIcon } from "lucide-react";

/** The Acknowledgement of Country and where Driftpost is made, at the end of About and the welcome. */
export function Acknowledgement() {
  return (
    <>
      <p>
        We acknowledge the Traditional Owners of the lands across Australia as the continuing custodians of Country
        and Culture. We pay our respect to First Nations peoples and their Elders, past and present.
      </p>
      <p className="flex items-center gap-1">
        Made with <HeartIcon className="size-3.5 fill-current text-red-500" aria-label="love" /> in Melbourne, Australia.
      </p>
    </>
  );
}
