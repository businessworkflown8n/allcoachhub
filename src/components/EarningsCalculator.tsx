import { useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, IndianRupee, Calculator } from "lucide-react";

const EarningsCalculator = () => {
  const [sessionPrice, setSessionPrice] = useState(2000);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(5);
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");

  const monthlyEarnings = sessionPrice * sessionsPerWeek * 4;
  const yearlyEarnings = monthlyEarnings * 12;
  const symbol = currency === "INR" ? "₹" : "$";

  const formatNum = (n: number) => n.toLocaleString("en-IN");

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 mb-4">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Earnings Calculator</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            How Much Can You Earn?
          </h2>
          <p className="text-muted-foreground">Slide to estimate your coaching income potential</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 items-start">
          {/* Controls */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            {/* Currency toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setCurrency("INR"); setSessionPrice(2000); }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${currency === "INR" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                <IndianRupee className="inline h-3.5 w-3.5 mr-1" />INR
              </button>
              <button
                onClick={() => { setCurrency("USD"); setSessionPrice(25); }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${currency === "USD" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                <DollarSign className="inline h-3.5 w-3.5 mr-1" />USD
              </button>
            </div>

            {/* Session Price */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per Session</span>
                <span className="font-semibold text-foreground">{symbol}{formatNum(sessionPrice)}</span>
              </div>
              <input
                type="range"
                min={currency === "INR" ? 500 : 5}
                max={currency === "INR" ? 10000 : 200}
                step={currency === "INR" ? 100 : 5}
                value={sessionPrice}
                onChange={(e) => setSessionPrice(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-full cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{symbol}{currency === "INR" ? "500" : "5"}</span>
                <span>{symbol}{currency === "INR" ? "10,000" : "200"}</span>
              </div>
            </div>

            {/* Sessions per Week */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sessions per Week</span>
                <span className="font-semibold text-foreground">{sessionsPerWeek}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={sessionsPerWeek}
                onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-full cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>20</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center space-y-1">
              <p className="text-sm text-muted-foreground">Estimated Monthly Earnings</p>
              <p className="text-4xl md:text-5xl font-bold text-primary">{symbol}{formatNum(monthlyEarnings)}</p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Yearly Potential</p>
                <p className="text-xl font-bold text-foreground">{symbol}{formatNum(yearlyEarnings)}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Sessions/month</p>
                <p className="text-xl font-bold text-foreground">{sessionsPerWeek * 4}</p>
              </div>
            </div>
            <Link to="/signup/coach" className="cta-3d primary w-full">
              Start Earning Now — Free Signup
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EarningsCalculator;
