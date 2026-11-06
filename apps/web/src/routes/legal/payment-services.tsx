import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument } from "@/components/legal-document";
export const Route = createFileRoute("/legal/payment-services")({
  component: () => <LegalDocument document="payment-services" />,
});
