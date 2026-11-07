import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={0} rows={8} />;
}
