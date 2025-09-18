const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const aiModelService = require('./aiModelService');

class JupyterIntegrationService {
  constructor() {
    this.notebookPath = path.join(__dirname, '..', '..', 'ai_training_notebook.ipynb');
    this.pythonPath = 'python'; // Default Python path, can be configured
    this.isRunning = false;
    this.currentProcess = null;
  }

  // Execute Jupyter notebook training
  async executeNotebookTraining(modelId, config) {
    try {
      if (this.isRunning) {
        throw new Error('Jupyter training is already running');
      }

      console.log('🚀 Starting Jupyter notebook training...');
      this.isRunning = true;

      // Create a Python script to execute the notebook
      const pythonScript = await this.createTrainingScript(config);
      const scriptPath = path.join(__dirname, '..', 'temp', `training_${modelId}.py`);

      // Ensure temp directory exists
      await fs.mkdir(path.dirname(scriptPath), { recursive: true });
      await fs.writeFile(scriptPath, pythonScript);

      // Execute the Python script
      return new Promise((resolve, reject) => {
        this.currentProcess = spawn(this.pythonPath, [scriptPath], {
          cwd: path.dirname(this.notebookPath),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        this.currentProcess.stdout.on('data', (data) => {
          const message = data.toString();
          output += message;
          console.log('📊 Training Output:', message.trim());
          
          // Parse progress updates
          this.parseProgressUpdate(message, modelId);
        });

        this.currentProcess.stderr.on('data', (data) => {
          const message = data.toString();
          errorOutput += message;
          console.error('❌ Training Error:', message.trim());
        });

        this.currentProcess.on('close', async (code) => {
          this.isRunning = false;
          this.currentProcess = null;

          // Clean up script file
          try {
            await fs.unlink(scriptPath);
          } catch (error) {
            console.warn('Could not clean up script file:', error.message);
          }

          if (code === 0) {
            console.log('✅ Jupyter training completed successfully');
            
            // Process the results
            const results = await this.processTrainingResults(modelId);
            resolve(results);
          } else {
            console.error('❌ Jupyter training failed with code:', code);
            reject(new Error(`Training failed: ${errorOutput}`));
          }
        });

        this.currentProcess.on('error', (error) => {
          this.isRunning = false;
          this.currentProcess = null;
          reject(error);
        });
      });

    } catch (error) {
      this.isRunning = false;
      this.currentProcess = null;
      console.error('❌ Error executing Jupyter training:', error);
      throw error;
    }
  }

  // Create Python script from notebook configuration
  async createTrainingScript(config) {
    const script = `
import sys
import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
import warnings
warnings.filterwarnings('ignore')

# Configuration
EPOCHS = ${config.epochs}
BATCH_SIZE = ${config.batchSize}
LEARNING_RATE = ${config.learningRate}
VALIDATION_SPLIT = ${config.validationSplit}
EARLY_STOPPING = ${config.earlyStopping}
PATIENCE = ${config.patience}

print(f"🚀 Starting training with config: Epochs={EPOCHS}, Batch={BATCH_SIZE}, LR={LEARNING_RATE}")

# Data Loading and Preprocessing
def create_sample_data(n_samples=1000):
    """Create realistic sample coffee log data for training"""
    np.random.seed(42)
    
    data = {
        'grindSize': np.random.normal(15, 3, n_samples).clip(5, 25),
        'extractionTime': np.random.normal(30, 5, n_samples).clip(15, 50),
        'temperature': np.random.normal(93, 2, n_samples).clip(85, 96),
        'inWeight': np.random.normal(18, 2, n_samples).clip(12, 25),
        'outWeight': np.random.normal(36, 4, n_samples).clip(20, 50),
        'usedPuckScreen': np.random.choice([0, 1], n_samples, p=[0.3, 0.7]),
        'usedWDT': np.random.choice([0, 1], n_samples, p=[0.4, 0.6]),
        'usedPreInfusion': np.random.choice([0, 1], n_samples, p=[0.5, 0.5]),
        'preInfusionTime': np.random.normal(5, 2, n_samples).clip(0, 15),
        'roastLevel': np.random.choice(['light', 'medium', 'dark'], n_samples),
        'processMethod': np.random.choice(['washed', 'natural', 'honey'], n_samples)
    }
    
    # Calculate derived features
    data['ratio'] = data['outWeight'] / data['inWeight']
    data['flowRate'] = data['outWeight'] / data['extractionTime']
    
    # Generate realistic shot quality based on parameters
    quality = np.zeros(n_samples)
    for i in range(n_samples):
        base_quality = 5
        
        # Extraction time bonus
        if 25 <= data['extractionTime'][i] <= 35:
            base_quality += 1
        elif data['extractionTime'][i] < 20 or data['extractionTime'][i] > 40:
            base_quality -= 1
            
        # Ratio bonus
        if 1.8 <= data['ratio'][i] <= 2.2:
            base_quality += 1
        elif data['ratio'][i] < 1.5 or data['ratio'][i] > 2.5:
            base_quality -= 1
            
        # Temperature bonus
        if 90 <= data['temperature'][i] <= 95:
            base_quality += 0.5
            
        # Technique bonuses
        if data['usedPuckScreen'][i]:
            base_quality += 0.5
        if data['usedWDT'][i]:
            base_quality += 0.5
        if data['usedPreInfusion'][i]:
            base_quality += 0.5
            
        # Add some randomness
        base_quality += np.random.normal(0, 0.5)
        
        quality[i] = np.clip(base_quality, 1, 10)
    
    data['shotQuality'] = quality
    
    return pd.DataFrame(data)

# Create sample dataset
df = create_sample_data(1000)
print(f"📊 Created dataset with {len(df)} samples")

# Feature Engineering and Preprocessing
def prepare_features(df):
    """Prepare features for machine learning"""
    # Encode categorical variables
    le_roast = LabelEncoder()
    le_process = LabelEncoder()
    
    df_encoded = df.copy()
    df_encoded['roastLevel_encoded'] = le_roast.fit_transform(df['roastLevel'])
    df_encoded['processMethod_encoded'] = le_process.fit_transform(df['processMethod'])
    
    # Select features for training
    feature_columns = [
        'grindSize', 'extractionTime', 'temperature', 'inWeight', 'outWeight',
        'usedPuckScreen', 'usedWDT', 'usedPreInfusion', 'preInfusionTime',
        'roastLevel_encoded', 'processMethod_encoded', 'ratio', 'flowRate'
    ]
    
    X = df_encoded[feature_columns]
    y = df_encoded['shotQuality']
    
    return X, y, feature_columns

# Prepare features
X, y, feature_columns = prepare_features(df)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=VALIDATION_SPLIT, random_state=42)

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print(f"📊 Training set: {X_train.shape[0]} samples")
print(f"📊 Test set: {X_test.shape[0]} samples")

# Deep Learning with TensorFlow/Keras
def create_deep_learning_model(input_shape):
    """Create a deep neural network for coffee quality prediction"""
    model = keras.Sequential([
        layers.Dense(128, activation='relu', input_shape=(input_shape,)),
        layers.Dropout(0.3),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(32, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(16, activation='relu'),
        layers.Dense(1, activation='linear')  # Regression output
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='mse',
        metrics=['mae', 'mse']
    )
    
    return model

# Create and train deep learning model
print("🧠 Creating Deep Learning Model...")
dl_model = create_deep_learning_model(X_train_scaled.shape[1])

# Callbacks
callbacks = []
if EARLY_STOPPING:
    callbacks.append(keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=PATIENCE,
        restore_best_weights=True
    ))

# Train the model
print("🔄 Training Deep Learning Model...")
history = dl_model.fit(
    X_train_scaled, y_train,
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    validation_data=(X_test_scaled, y_test),
    callbacks=callbacks,
    verbose=1
)

# Evaluate deep learning model
dl_predictions = dl_model.predict(X_test_scaled).flatten()
dl_mae = mean_absolute_error(y_test, dl_predictions)
dl_rmse = np.sqrt(mean_squared_error(y_test, dl_predictions))
dl_r2 = r2_score(y_test, dl_predictions)

print(f"✅ Deep Learning Model - MAE: {dl_mae:.3f}, RMSE: {dl_rmse:.3f}, R²: {dl_r2:.3f}")

# Save model and results
model_dir = os.path.join(os.path.dirname(__file__), '..', 'models', 'ai', '${modelId}')
os.makedirs(model_dir, exist_ok=True)

# Save TensorFlow model
model_path = os.path.join(model_dir, 'model.h5')
dl_model.save(model_path)

# Save scaler
scaler_path = os.path.join(model_dir, 'scaler.pkl')
import joblib
joblib.dump(scaler, scaler_path)

# Save feature columns
features_path = os.path.join(model_dir, 'features.json')
with open(features_path, 'w') as f:
    json.dump(feature_columns, f)

# Save metadata
metadata = {
    'model_type': 'tensorflow',
    'architecture': {
        'input_features': X_train_scaled.shape[1],
        'hidden_layers': [128, 64, 32, 16],
        'output_features': 1,
        'activation_function': 'relu',
        'optimizer': 'adam',
        'loss_function': 'mse'
    },
    'training_config': {
        'epochs': EPOCHS,
        'batch_size': BATCH_SIZE,
        'learning_rate': LEARNING_RATE,
        'validation_split': VALIDATION_SPLIT,
        'early_stopping': EARLY_STOPPING,
        'patience': PATIENCE
    },
    'performance_metrics': {
        'mae': float(dl_mae),
        'rmse': float(dl_rmse),
        'r2': float(dl_r2),
        'accuracy': float(max(0, 1 - dl_mae / 5))  # Approximate accuracy
    },
    'training_data': {
        'total_samples': len(df),
        'training_samples': len(X_train),
        'validation_samples': len(X_test),
        'features': feature_columns
    },
    'training_history': {
        'final_loss': float(history.history['loss'][-1]),
        'final_val_loss': float(history.history['val_loss'][-1]),
        'final_mae': float(history.history['mae'][-1]),
        'final_val_mae': float(history.history['val_mae'][-1])
    }
}

metadata_path = os.path.join(model_dir, 'metadata.json')
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)

print("✅ Model saved successfully!")
print(f"📁 Model files saved to: {model_dir}")
print(f"📊 Final metrics: MAE={dl_mae:.3f}, RMSE={dl_rmse:.3f}, R²={dl_r2:.3f}")
`;

    return script;
  }

  // Parse progress updates from training output
  parseProgressUpdate(message, modelId) {
    try {
      // Look for epoch progress
      const epochMatch = message.match(/Epoch (\d+)\/(\d+)/);
      if (epochMatch) {
        const currentEpoch = parseInt(epochMatch[1]);
        const totalEpochs = parseInt(epochMatch[2]);
        const progress = (currentEpoch / totalEpochs) * 100;

        // Update training progress in database
        aiModelService.updateTrainingProgress(modelId, {
          epoch: currentEpoch,
          progress: progress
        });
      }

      // Look for loss values
      const lossMatch = message.match(/loss: (\d+\.\d+)/);
      const valLossMatch = message.match(/val_loss: (\d+\.\d+)/);
      
      if (lossMatch || valLossMatch) {
        const loss = lossMatch ? parseFloat(lossMatch[1]) : null;
        const valLoss = valLossMatch ? parseFloat(valLossMatch[1]) : null;

        aiModelService.updateTrainingProgress(modelId, {
          loss: loss,
          valLoss: valLoss
        });
      }
    } catch (error) {
      console.error('Error parsing progress update:', error);
    }
  }

  // Process training results
  async processTrainingResults(modelId) {
    try {
      const modelDir = path.join(__dirname, '..', 'models', 'ai', modelId);
      const metadataPath = path.join(modelDir, 'metadata.json');

      // Read metadata
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

      // Update model in database
      await aiModelService.completeTraining(modelId, {
        performanceMetrics: metadata.performance_metrics,
        trainingData: metadata.training_data,
        architecture: metadata.architecture,
        featureEngineering: {
          features: metadata.training_data.features,
          preprocessingSteps: ['normalization', 'encoding', 'feature_scaling']
        },
        modelFiles: {
          model: path.join(modelDir, 'model.h5'),
          scaler: path.join(modelDir, 'scaler.pkl'),
          features: path.join(modelDir, 'features.json'),
          metadata: metadataPath
        }
      });

      return metadata;
    } catch (error) {
      console.error('Error processing training results:', error);
      throw error;
    }
  }

  // Stop current training
  async stopTraining() {
    if (this.currentProcess && this.isRunning) {
      console.log('🛑 Stopping Jupyter training...');
      this.currentProcess.kill('SIGTERM');
      this.isRunning = false;
      this.currentProcess = null;
      return true;
    }
    return false;
  }

  // Get training status
  getTrainingStatus() {
    return {
      isRunning: this.isRunning,
      hasProcess: !!this.currentProcess
    };
  }

  // Check if Jupyter environment is available
  async checkEnvironment() {
    try {
      // Check if Python is available
      const pythonCheck = await this.executeCommand('python --version');
      if (!pythonCheck.success) {
        return { available: false, error: 'Python not found' };
      }

      // Check if required packages are available
      const packages = ['tensorflow', 'sklearn', 'pandas', 'numpy'];
      for (const pkg of packages) {
        const check = await this.executeCommand(`python -c "import ${pkg}"`);
        if (!check.success) {
          return { available: false, error: `Package ${pkg} not found` };
        }
      }

      return { available: true };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }

  // Execute a command and return result
  executeCommand(command) {
    return new Promise((resolve) => {
      const process = spawn(command, { shell: true });
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: errorOutput.trim()
        });
      });
    });
  }
}

module.exports = new JupyterIntegrationService();
