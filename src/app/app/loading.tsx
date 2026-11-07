import { PageSkeleton } from "@/components/portal/skeletons/page-skeleton";

export default function AppLoading() {
  return <PageSkeleton cards={4} rows={7} />;
}
