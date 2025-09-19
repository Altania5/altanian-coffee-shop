
# Google Colab Code - Load Your Coffee Logs Data
# Copy and paste this code into a new cell in your Colab notebook

import pandas as pd
import numpy as np
from google.colab import files

# Upload the CSV file
print("📁 Please upload the 'coffee_logs_training_data.csv' file")
uploaded = files.upload()

# Load the data
df = pd.read_csv('coffee_logs_training_data.csv')
print(f"📊 Loaded {len(df)} coffee logs")
print(f"📈 Dataset shape: {df.shape}")
print(f"📋 Columns: {list(df.columns)}")

# Display basic info
print("\n📊 Dataset Info:")
print(df.info())

# Display first few rows
print("\n📋 First 5 rows:")
print(df.head())

# Display quality distribution
print("\n📈 Shot Quality Distribution:")
print(df['shotQuality'].value_counts().sort_index())

# Display roast level distribution
print("\n☕ Roast Level Distribution:")
print(df['roastLevel'].value_counts())

# Display process method distribution
print("\n🌱 Process Method Distribution:")
print(df['processMethod'].value_counts())

# Check for missing values
print("\n❓ Missing Values:")
print(df.isnull().sum())

# Basic statistics
print("\n📊 Basic Statistics:")
print(df.describe())

# Ready for training!
print("\n🚀 Data is ready for training! You can now use this DataFrame in your notebook.")
print("\n💡 Next steps:")
print("1. Use the 'prepare_features()' function from your notebook")
print("2. Split the data into training and testing sets")
print("3. Train your models!")
