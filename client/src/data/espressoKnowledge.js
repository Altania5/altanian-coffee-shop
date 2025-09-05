// Espresso Knowledge Base for AI Training
// Based on coffee science and barista expertise

export const IDEAL_PARAMETERS = {
  // Standard espresso parameters
  ratio: { min: 1.8, ideal: 2.0, max: 2.5 },
  extractionTime: { min: 22, ideal: 28, max: 35 },
  temperature: { min: 90, ideal: 93, max: 96 },
  grindSize: { min: 8, ideal: 15, max: 25 }, // Machine dependent
  extractionYield: { min: 18, ideal: 20, max: 22 },
  flowRate: { min: 1.0, ideal: 1.3, max: 2.0 }, // ml/second
  
  // Bean characteristics
  daysPastRoast: {
    tooFresh: { min: 0, max: 4, advice: "Let beans degas more" },
    optimal: { min: 5, max: 21, advice: "Perfect window" },
    aging: { min: 22, max: 35, advice: "Still good, may need adjustments" },
    stale: { min: 36, max: 60, advice: "Consider fresher beans" }
  }
};

export const TROUBLESHOOTING_RULES = [
  // Under-extraction issues
  {
    conditions: {
      shotQuality: { max: 4 },
      extractionTime: { max: 25 },
      tasteProfile: { acidity: { min: 4 }, bitterness: { max: 2 } }
    },
    diagnosis: "Under-extracted",
    recommendations: [
      "Grind finer (decrease grind size by 0.5-1 step)",
      "Increase dose slightly (+0.5g)",
      "Check if tamping pressure is consistent",
      "Ensure even distribution before tamping"
    ],
    confidence: 0.9
  },
  
  // Over-extraction issues
  {
    conditions: {
      shotQuality: { max: 4 },
      extractionTime: { min: 35 },
      tasteProfile: { bitterness: { min: 4 }, sweetness: { max: 2 } }
    },
    diagnosis: "Over-extracted",
    recommendations: [
      "Grind coarser (increase grind size by 0.5-1 step)",
      "Decrease dose slightly (-0.5g)",
      "Lower water temperature by 1-2°C",
      "Check for channeling issues"
    ],
    confidence: 0.9
  },
  
  // Fast extraction
  {
    conditions: {
      extractionTime: { max: 20 },
      flowRate: { min: 2.2 }
    },
    diagnosis: "Extraction too fast",
    recommendations: [
      "Grind significantly finer",
      "Increase dose by 1-2g",
      "Improve tamping technique",
      "Check for distribution issues"
    ],
    confidence: 0.85
  },
  
  // Slow extraction
  {
    conditions: {
      extractionTime: { min: 40 },
      flowRate: { max: 0.8 }
    },
    diagnosis: "Extraction too slow",
    recommendations: [
      "Grind coarser",
      "Decrease dose by 1g",
      "Check for over-tamping",
      "Ensure grinder isn't producing too many fines"
    ],
    confidence: 0.85
  },
  
  // Sour shots
  {
    conditions: {
      tasteProfile: { acidity: { min: 4 }, sweetness: { max: 2 } },
      shotQuality: { max: 5 }
    },
    diagnosis: "Shot too sour/acidic",
    recommendations: [
      "Grind finer to increase extraction",
      "Increase water temperature by 1°C",
      "Extend extraction time slightly",
      "Consider a darker roast profile"
    ],
    confidence: 0.8
  },
  
  // Bitter shots
  {
    conditions: {
      tasteProfile: { bitterness: { min: 4 }, sweetness: { max: 2 } },
      shotQuality: { max: 5 }
    },
    diagnosis: "Shot too bitter",
    recommendations: [
      "Grind coarser to reduce extraction",
      "Lower water temperature by 1-2°C",
      "Reduce extraction time",
      "Check bean freshness - may be over-roasted"
    ],
    confidence: 0.8
  },
  
  // Weak/watery shots
  {
    conditions: {
      tasteProfile: { body: { max: 2 } },
      ratio: { min: 2.5 },
      shotQuality: { max: 5 }
    },
    diagnosis: "Shot too weak/watery",
    recommendations: [
      "Increase dose by 1-2g",
      "Grind finer",
      "Reduce output weight for stronger ratio",
      "Check for channeling or poor distribution"
    ],
    confidence: 0.85
  },
  
  // Bean-specific recommendations
  {
    conditions: {
      daysPastRoast: { max: 4 }
    },
    diagnosis: "Beans too fresh",
    recommendations: [
      "Let beans rest 2-3 more days",
      "Grind slightly coarser than usual",
      "Consider slightly longer extraction",
      "Expect some inconsistency until degassed"
    ],
    confidence: 0.7
  },
  
  {
    conditions: {
      daysPastRoast: { min: 30 }
    },
    diagnosis: "Beans getting stale",
    recommendations: [
      "Grind finer to compensate for reduced solubles",
      "Increase water temperature slightly",
      "Consider increasing dose",
      "Store beans properly to slow degradation"
    ],
    confidence: 0.75
  }
];

export const MACHINE_PROFILES = {
  "Meraki": {
    grindRange: { min: 10, max: 20 },
    pressureProfile: "constant_9_bar",
    temperatureStability: "high",
    recommendations: {
      startingGrind: 15,
      temperatureOffset: 0
    }
  },
  "Breville": {
    grindRange: { min: 8, max: 25 },
    pressureProfile: "variable",
    temperatureStability: "medium",
    recommendations: {
      startingGrind: 18,
      temperatureOffset: -1
    }
  },
  "La Marzocco": {
    grindRange: { min: 5, max: 30 },
    pressureProfile: "constant_9_bar",
    temperatureStability: "high",
    recommendations: {
      startingGrind: 12,
      temperatureOffset: 0
    }
  }
};

export const TASTE_PROFILES = {
  balanced: {
    sweetness: 3,
    acidity: 3,
    bitterness: 3,
    body: 3,
    description: "Well-rounded, harmonious flavors"
  },
  bright: {
    sweetness: 2,
    acidity: 4,
    bitterness: 2,
    body: 3,
    description: "High acidity, clean, vibrant"
  },
  sweet: {
    sweetness: 4,
    acidity: 2,
    bitterness: 2,
    body: 4,
    description: "Prominent sweetness, full body"
  },
  strong: {
    sweetness: 2,
    acidity: 2,
    bitterness: 4,
    body: 4,
    description: "Bold, intense, full-bodied"
  },
  fruity: {
    sweetness: 3,
    acidity: 4,
    bitterness: 2,
    body: 2,
    description: "Fruit-forward, bright acidity"
  },
  chocolatey: {
    sweetness: 4,
    acidity: 2,
    bitterness: 3,
    body: 4,
    description: "Rich, sweet, chocolate notes"
  }
};

export const ENVIRONMENTAL_FACTORS = {
  humidity: {
    low: { max: 40, effect: "Beans may extract faster", adjustment: "Grind slightly coarser" },
    medium: { min: 41, max: 60, effect: "Optimal conditions", adjustment: "No adjustment needed" },
    high: { min: 61, effect: "Beans may extract slower", adjustment: "Grind slightly finer" }
  },
  
  temperature: {
    cold: { max: 85, effect: "Under-extraction risk", adjustment: "Increase temperature" },
    optimal: { min: 90, max: 96, effect: "Ideal extraction", adjustment: "Fine-tune based on taste" },
    hot: { min: 97, effect: "Over-extraction risk", adjustment: "Decrease temperature" }
  }
};

// Training data generator for creating synthetic data points
export const generateTrainingData = () => {
  const trainingSet = [];
  
  // Generate ideal shots
  for (let i = 0; i < 50; i++) {
    trainingSet.push({
      grindSize: IDEAL_PARAMETERS.grindSize.ideal + (Math.random() - 0.5) * 2,
      inWeight: 18 + (Math.random() - 0.5) * 2,
      outWeight: 36 + (Math.random() - 0.5) * 4,
      extractionTime: IDEAL_PARAMETERS.extractionTime.ideal + (Math.random() - 0.5) * 4,
      temperature: IDEAL_PARAMETERS.temperature.ideal + (Math.random() - 0.5) * 2,
      daysPastRoast: Math.floor(Math.random() * 20) + 5,
      shotQuality: Math.floor(Math.random() * 3) + 7, // 7-10 quality
      tasteProfile: {
        sweetness: 3 + (Math.random() - 0.5),
        acidity: 3 + (Math.random() - 0.5),
        bitterness: 3 + (Math.random() - 0.5),
        body: 3 + (Math.random() - 0.5)
      },
      label: 'good'
    });
  }
  
  // Generate problematic shots with known issues
  TROUBLESHOOTING_RULES.forEach(rule => {
    for (let i = 0; i < 10; i++) {
      const shot = generateShotFromRule(rule);
      shot.label = 'needs_improvement';
      shot.expectedDiagnosis = rule.diagnosis;
      shot.expectedRecommendations = rule.recommendations;
      trainingSet.push(shot);
    }
  });
  
  return trainingSet;
};

const generateShotFromRule = (rule) => {
  // Generate a shot that matches the rule conditions
  const shot = {
    grindSize: 15 + (Math.random() - 0.5) * 4,
    inWeight: 18 + (Math.random() - 0.5) * 2,
    outWeight: 36 + (Math.random() - 0.5) * 8,
    extractionTime: 28 + (Math.random() - 0.5) * 10,
    temperature: 93 + (Math.random() - 0.5) * 4,
    daysPastRoast: Math.floor(Math.random() * 30) + 5,
    shotQuality: 3,
    tasteProfile: {
      sweetness: 3,
      acidity: 3,
      bitterness: 3,
      body: 3
    }
  };
  
  // Apply rule conditions
  Object.keys(rule.conditions).forEach(param => {
    const condition = rule.conditions[param];
    if (param === 'tasteProfile') {
      Object.keys(condition).forEach(taste => {
        const tasteCondition = condition[taste];
        if (tasteCondition.min !== undefined) {
          shot.tasteProfile[taste] = tasteCondition.min + Math.random();
        }
        if (tasteCondition.max !== undefined) {
          shot.tasteProfile[taste] = tasteCondition.max - Math.random();
        }
      });
    } else {
      if (condition.min !== undefined) {
        shot[param] = condition.min + Math.random() * 5;
      }
      if (condition.max !== undefined) {
        shot[param] = condition.max - Math.random() * 5;
      }
    }
  });
  
  return shot;
};

export default {
  IDEAL_PARAMETERS,
  TROUBLESHOOTING_RULES,
  MACHINE_PROFILES,
  TASTE_PROFILES,
  ENVIRONMENTAL_FACTORS,
  generateTrainingData
};
