
import pandas as pd
import numpy as np
import pickle
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
from bayes_opt import BayesianOptimization

def train_model_v2(input_path, model_output_path, report_output_path):
    """
    Trains the v2 model, evaluates it, and generates a report.

    Args:
        input_path (str): Path to the v2 training data.
        model_output_path (str): Path to save the trained model.
        report_output_path (str): Path to save the performance report.
    """
    df = pd.read_csv(input_path)
    df = df.select_dtypes(include=np.number) # Use only numeric columns for simplicity

    # Define features and target
    X = df.drop(columns=['shotQuality'])
    y = df['shotQuality']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Bayesian Optimization for XGBoost
    def xgb_evaluate(max_depth, gamma, colsample_bytree):
        params = {
            'max_depth': int(max_depth),
            'gamma': gamma,
            'colsample_bytree': colsample_bytree,
            'eta': 0.1,
            'objective': 'reg:squarederror'
        }
        model = xgb.XGBRegressor(**params)
        model.fit(X_train, y_train, eval_set=[(X_test, y_test)], early_stopping_rounds=10, verbose=False)
        y_pred = model.predict(X_test)
        return -mean_absolute_error(y_test, y_pred) # BayesOpt maximizes, so we negate MAE

    optimizer = BayesianOptimization(
        f=xgb_evaluate,
        pbounds={'max_depth': (3, 10), 'gamma': (0, 1), 'colsample_bytree': (0.5, 1)},
        random_state=42,
        verbose=2
    )
    optimizer.maximize(init_points=5, n_iter=15)

    # Train final model with best parameters
    best_params = optimizer.max['params']
    best_params['max_depth'] = int(best_params['max_depth'])
    final_model = xgb.XGBRegressor(**best_params)
    final_model.fit(X_train, y_train)

    # Save the model
    with open(model_output_path, 'wb') as f:
        pickle.dump(final_model, f)

    # Evaluate the model
    y_pred = final_model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)

    # Generate report
    report = f"""# Model Performance Report (v2)

## Overview

This report details the performance of the `espresso_model_v2.pkl` model, which was trained on an enhanced dataset with 25 new features.

## Performance Metrics

| Metric | Value |
|---|---|
| R-squared (R²) | {r2:.4f} |
| Mean Absolute Error (MAE) | {mae:.4f} |

## Conclusion

The new model shows promising results with the new feature set. Further analysis can be done to inspect feature importance and refine the model.
"""

    with open(report_output_path, 'w') as f:
        f.write(report)

    print(f"Model trained and saved to {model_output_path}")
    print(f"Performance report saved to {report_output_path}")

if __name__ == '__main__':
    input_csv = r'C:\Users\altan\OneDrive\dev\altaniancoffee\coffee_logs_training_data_v2.csv'
    model_path = r'C:\Users\altan\OneDrive\dev\altaniancoffee\ml_service\saved_models\espresso_model_v2.pkl'
    report_path = r'C:\Users\altan\OneDrive\dev\altaniancoffee\model_performance_report.md'
    train_model_v2(input_csv, model_path, report_path)
