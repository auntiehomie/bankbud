import { useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import './SavingsCalculator.css';

interface SavingsCalculatorProps {
  currentRate: number;
  newRate: number;
  bankName: string;
}

export default function SavingsCalculator({ currentRate, newRate, bankName }: SavingsCalculatorProps) {
  const [amount, setAmount] = useState<number>(10000);
  const [showCalculator, setShowCalculator] = useState(false);

  const calculateEarnings = (rate: number, principal: number) => {
    return (principal * (rate / 100));
  };

  const currentEarnings = calculateEarnings(currentRate, amount);
  const newEarnings = calculateEarnings(newRate, amount);
  const difference = newEarnings - currentEarnings;
  const percentageIncrease = currentRate > 0 ? ((difference / currentEarnings) * 100) : 0;

  return (
    <div className="savings-calculator">
      <button 
        className="calculator-toggle"
        onClick={() => setShowCalculator(!showCalculator)}
      >
        <Calculator size={16} />
        {showCalculator ? 'Hide' : 'Calculate'} Your Savings
      </button>

      {showCalculator && (
        <div className="calculator-content">
          <div className="calculator-input">
            <label>How much would you deposit?</label>
            <div className="amount-input">
              <span className="currency">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min="0"
                step="1000"
              />
            </div>
          </div>

          <div className="calculator-results">
            <div className="result-row current">
              <div className="result-label">
                <span>Your Current Rate</span>
                <span className="rate-value">{currentRate.toFixed(2)}%</span>
              </div>
              <div className="result-earnings">
                ${currentEarnings.toFixed(2)} / year
              </div>
            </div>

            <div className="result-divider">
              <TrendingUp size={20} />
            </div>

            <div className="result-row new">
              <div className="result-label">
                <span>{bankName}</span>
                <span className="rate-value">{newRate.toFixed(2)}%</span>
              </div>
              <div className="result-earnings">
                ${newEarnings.toFixed(2)} / year
              </div>
            </div>

            {difference > 0 && (
              <div className="result-difference">
                <div className="difference-amount">
                  <strong>+${difference.toFixed(2)}</strong> more per year
                </div>
                {percentageIncrease > 0 && (
                  <div className="difference-percentage">
                    That's {percentageIncrease.toFixed(1)}% more interest!
                  </div>
                )}
              </div>
            )}

            {difference < 0 && (
              <div className="result-difference negative">
                <div className="difference-amount">
                  ${Math.abs(difference).toFixed(2)} less per year
                </div>
                <div className="difference-percentage">
                  Your current rate is better
                </div>
              </div>
            )}

            {difference === 0 && (
              <div className="result-difference neutral">
                <div className="difference-amount">
                  Same earnings
                </div>
              </div>
            )}
          </div>

          <div className="calculator-note">
            <small>
              💡 This calculation assumes simple annual interest. Actual earnings may vary based on 
              compounding frequency, fees, and account terms.
            </small>
          </div>
        </div>
      )}
    </div>
  );
}
