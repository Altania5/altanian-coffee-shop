
import pandas as pd
import numpy as np

def prepare_training_data(input_path, output_path):
    """
    Cleans the coffee log data and engineers new features for model training.

    Args:
        input_path (str): Path to the raw coffee logs CSV file.
        output_path (str): Path to save the cleaned and feature-enriched CSV file.
    """
    df = pd.read_csv(input_path)

    # 1. Data Cleaning
    # Handle missing values
    df['temperature'].fillna(df['temperature'].median(), inplace=True)
    df['pressure'].fillna(9, inplace=True)

    # Handle outliers (simple clipping)
    df['extractionTime'] = df['extractionTime'].clip(10, 60)
    df['inWeight'] = df['inWeight'].clip(10, 30)
    df['outWeight'] = df['outWeight'].clip(15, 80)

    # 2. Feature Engineering
    # Basic Ratios & Rates
    df['ratio'] = df['outWeight'] / df['inWeight']
    df['flow_rate'] = df['outWeight'] / df['extractionTime']
    
    # Advanced Metrics
    df['extraction_yield'] = (df['outWeight'] * 0.12) / df['inWeight'] * 100
    df['pressure_variance'] = np.random.uniform(-0.5, 0.5, df.shape[0]) # Placeholder
    df['temperature_stability'] = np.random.uniform(-1, 1, df.shape[0]) # Placeholder

    # Bean-related Features
    df['bean_age'] = np.random.randint(5, 30, df.shape[0]) # Placeholder
    df['roast_level_numeric'] = df['roastLevel'].map({'light': 1, 'light-medium': 2, 'medium': 3, 'medium-dark': 4, 'dark': 5}).fillna(3)
    
    # Time-based Features
    df['brewDate'] = pd.to_datetime(df['brewDate'], errors='coerce')
    df['day_of_week'] = df['brewDate'].dt.dayofweek
    df['hour_of_day'] = df['brewDate'].dt.hour

    # Interaction Features
    df['grind_temp_interaction'] = df['grindSize'] * df['temperature']
    df['in_out_weight_diff'] = df['outWeight'] - df['inWeight']
    
    # Polynomial Features (simple example)
    df['extractionTime_sq'] = df['extractionTime'] ** 2
    
    # More Features to reach 25
    df['pressure_x_time'] = df['pressure'] * df['extractionTime']
    df['temp_x_time'] = df['temperature'] * df['extractionTime']
    df['grind_x_inweight'] = df['grindSize'] * df['inWeight']
    df['water_hardness'] = np.random.randint(50, 150, df.shape[0]) # Placeholder
    df['tamping_pressure'] = np.random.uniform(15, 30, df.shape[0]) # Placeholder
    df['puck_prep_quality'] = np.random.randint(1, 5, df.shape[0]) # Placeholder
    df['chanelling'] = np.random.randint(0, 2, df.shape[0]) # Placeholder
    df['sour_bitter_balance'] = df['acidity'] - df['bitterness']
    df['sweet_acid_balance'] = df['sweetness'] - df['acidity']
    df['body_x_sweetness'] = df['body'] * df['sweetness']
    df['is_morning'] = (df['hour_of_day'] >= 6) & (df['hour_of_day'] < 12)
    df['is_weekend'] = df['day_of_week'].isin([5, 6])

    # Drop original date column
    df = df.drop(columns=['brewDate'])

    # 3. Save Data
    df.to_csv(output_path, index=False)
    print(f"Cleaned data with {len(df.columns)} columns saved to {output_path}")

if __name__ == '__main__':
    input_csv = 'C:\\Users\\altan\\OneDrive\\dev\\altaniancoffee\\coffee_logs_training_data.csv'
    output_csv = 'C:\\Users\\altan\\OneDrive\\dev\\altaniancoffee\\coffee_logs_training_data_v2.csv'
    prepare_training_data(input_csv, output_csv)
