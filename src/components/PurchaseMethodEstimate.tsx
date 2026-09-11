import type { PurchaseRecommendationInput } from "@/lib/dashboard/purchase-recommendation";
import { recommendPurchaseMethod } from "@/lib/dashboard/purchase-recommendation";

function money(value: number | null) {
  return value === null ? "unknown" : `$${value.toLocaleString()}`;
}

function conditionalPoints(value: number | null, unit: string) {
  return value === null ? `unknown ${unit} points if eligible cash is charged` : `if eligible cash is charged, ${value.toLocaleString()} ${unit} points`;
}

export function PurchaseMethodEstimate({ input }: { input: PurchaseRecommendationInput }) {
  const rec = recommendPurchaseMethod(input);
  const transferLines = rec.transferPaths.length === 0
    ? ["No mapped Chase/Amex transfer path for the reported carrier, or the carrier is unknown/incomplete."]
    : rec.transferPaths.map((path) => {
      const ratio = path.partner.transferRatio.fromPoints === null
        ? "transfer ratio unknown"
        : `${path.partner.transferRatio.fromPoints}:${path.partner.transferRatio.toMiles}`;
      const increment = path.partner.increment === null ? "increment unknown" : `${path.partner.increment.toLocaleString()}-point increments`;
      return `Possible ${path.partner.issuer} path to ${path.partner.programName} for reported carrier ${path.reportedCarrier} (${path.relationship}; ${ratio}; ${increment}). Verify operator and inventory. Reviewed ${path.partner.reviewedAt}.`;
    });

  return (
    <div className="mt-3 min-w-0">
      <p className="text-sm leading-5 text-muted break-words">{rec.headline}</p>
      <details className="mt-1">
        <summary className="cursor-pointer py-1 text-xs font-medium text-accent">Why this estimate</summary>
        <div className="mt-2 space-y-2 break-words text-xs leading-5 text-muted">
          <p>Policy fallback — not a verified comparison. {rec.identityNote}</p>
          <p>Cash price: {money(rec.cashPrice)}. Points spent for a cash booking: none. Fees: unknown (never assumed $0).</p>
          <ul className="list-disc space-y-1 pl-4">
            {rec.earn.map((line) => (
              <li key={line.channel}>{line.channel}: {conditionalPoints(line.pointsIfEligibleCash, line.unit)}. {line.note}</li>
            ))}
          </ul>
          <p>
            Portal alternatives (availability unverified):{" "}
            <a href={rec.portalLinks.chaseTravel} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">Chase Travel</a>
            {" "}8x / 1¢ standard;{" "}
            <a href={rec.portalLinks.amexTravel} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">Amex Travel</a>
            {" "}2x earn / 1¢ Pay with Points. {rec.payWithPoints.text}
          </p>
          <p>Possible transfer paths for the reported carrier:</p>
          <ul className="list-disc space-y-1 pl-4">
            {transferLines.map((line) => <li key={line}>{line}</li>)}
          </ul>
          {rec.transferPaths.map((path) => (
            <p key={`${path.partner.id}-src`}>
              {path.partner.programName} sources:{" "}
              <a href={path.partner.transferSourceUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">transfer</a>
              {" · "}
              <a href={path.bookingSourceUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">booking relationship</a>
              {path.partner.transferRatio.fromPoints !== null ? (
                <>
                  {" · "}
                  <a href={path.partner.transferRatio.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">ratio</a>
                </>
              ) : (
                <>
                  {" · "}
                  <a href={path.partner.transferRatio.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">ratio unknown</a>
                </>
              )}
              {` · reviewed ${path.partner.reviewedAt}`}
            </p>
          ))}
          {rec.awards.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4">
              {rec.awards.map((award) => (
                <li key={`${award.issuer}-${award.programName}`}>
                  {award.programName}: {award.status === "conditional" && award.points !== null
                    ? `conditional ${award.points.toLocaleString()} points + unknown fees`
                    : "award cost unknown"}
                  . {award.note}{" "}
                  <a href={award.researchUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">Research</a>
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="list-disc space-y-1 pl-4">
            {rec.disclosures.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      </details>
    </div>
  );
}
