import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";

export default function Loading() {
  return <PageSkeleton cards={4} rows={6} />;
}
