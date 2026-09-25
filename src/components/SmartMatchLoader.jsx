import "./SmartMatchLoader.css";

function SmartMatchLoader({ text = "Scanning Smart Lost & Found..." }) {
  return (
    <div className="smart-loader-overlay">
      <div className="smart-loader">

        <div className="smart-loader-ring smart-loader-ring-one"></div>
        <div className="smart-loader-ring smart-loader-ring-two"></div>
        <div className="smart-loader-ring smart-loader-ring-three"></div>

        <div className="smart-loader-core">
          <div className="smart-loader-core-dot"></div>
        </div>

        <div className="smart-loader-scan-line"></div>

        <div className="smart-loader-orbit orbit-one"></div>
        <div className="smart-loader-orbit orbit-two"></div>

        <div className="smart-loader-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className="smart-loader-text">
          <span className="smart-loader-title">SMARTMATCH</span>
          <span className="smart-loader-subtitle">{text}</span>
        </div>

      </div>
    </div>
  );
}

export default SmartMatchLoader;