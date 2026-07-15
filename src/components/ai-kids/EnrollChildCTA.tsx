import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface Props {
  className?: string;
}

/**
 * Premium 3D neon-green enroll CTA. Links to /ai-kids/enrollment
 * (same destination as the sidebar "Enroll Your Child" button).
 */
const EnrollChildCTA = ({ className = "" }: Props) => {
  return (
    <Link
      to="/ai-kids/enrollment"
      aria-label="Enroll Your Child"
      className={`enroll-3d-cta group ${className}`}
    >
      <span className="enroll-3d-cta__shine" aria-hidden="true" />
      <span className="enroll-3d-cta__label">
        <span className="text-xl leading-none">🚀</span>
        <span>Enroll Your Child</span>
        <ArrowRight className="enroll-3d-cta__arrow h-5 w-5" aria-hidden="true" />
      </span>
    </Link>
  );
};

export default EnrollChildCTA;
