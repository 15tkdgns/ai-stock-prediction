# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
```bash
# Run the complete AI stock prediction pipeline
python src/utils/system_orchestrator.py

# Train models individually  
python src/models/model_training.py

# Run realtime testing
python src/testing/run_realtime_test.py

# Start dashboard server
cd dashboard && python server.py
# or use npm commands:
cd dashboard && npm run dev
cd dashboard && npm start

# Install Python dependencies
pip install -r config/requirements.txt

# Code formatting and linting
black .
ruff .
cd dashboard && npm run lint
cd dashboard && npm run format
```

### Dashboard Development

**Recommended Methods (Smart Auto-Detection):**
```bash
cd dashboard
npm run dev        # Smart http-server with auto port detection (RECOMMENDED)
npm run serve      # Smart serve with auto port detection  
npm run dev:force  # Force kill existing servers and restart
```

**Alternative Methods:**
```bash
# Simple servers (no smart features)
npm run dev:simple    # Basic http-server without smart features
npm run serve:simple  # Basic serve without smart features
npm run python-server # Python-based server

# Direct script usage with options
./start-dev.sh http-server         # Use http-server (recommended)
./start-dev.sh serve              # Use serve
./start-dev.sh python             # Use Python server  
./start-dev.sh http-server --force # Force restart
./start-dev.sh --help             # Show all options

# Development tools
npm run lint       # ESLint check
npm run format     # Format with Prettier
```

**Smart Server Features:**
- Automatic port conflict detection and resolution
- Process management (detect and optionally kill existing servers)
- Multiple server type support (http-server, serve, Python)
- User-friendly status messages with emojis
- Fallback port selection (8080 → 8081 → 8082... up to 9000)

## Architecture Overview

This is an AI stock prediction system for S&P500 event detection with the following key components:

### Core System Architecture

- **`src/core/`**: Core data collection and preprocessing pipeline
  - `data_collection_pipeline.py`: Automated S&P500 data collection
  - `advanced_preprocessing.py`: Advanced feature engineering and preprocessing techniques
  - `api_config.py`: API configuration management

- **`src/models/`**: Machine learning model training and management
  - `model_training.py`: Main model training class (SP500EventDetectionModel)
  - Supports Random Forest, Gradient Boosting, LSTM, and XGBoost models
  - Models are saved to `data/models/` directory

- **`src/testing/`**: Real-time testing and validation systems
  - `realtime_testing_system.py`: Real-time prediction testing
  - `validation_checker.py`: Data validation and quality checks
  - `run_realtime_test.py`: Standalone realtime test runner

- **`src/analysis/`**: Result analysis and reporting
  - Generates comprehensive model performance reports
  - Creates visualizations and performance metrics
  - XAI (Explainable AI) monitoring with SHAP/LIME

- **`src/utils/`**: System orchestration and utilities
  - `system_orchestrator.py`: Main system coordinator that runs the full pipeline
  - Handles GPU detection and resource management
  - Coordinates all system components

### Dashboard Architecture

- **Single Page Application (SPA)** with client-side routing
- **Real-time monitoring** dashboard with Chart.js visualizations
- **Modular JavaScript architecture** in `dashboard/src/` with components pattern
- **Python Flask server** (`dashboard/server.py`) for API endpoints
- **Responsive design** with CSS Grid/Flexbox

### Data Pipeline

1. **Data Collection**: Automated S&P500 stock data collection via yfinance
2. **Feature Engineering**: Technical indicators, volatility metrics, price spikes
3. **Model Training**: Multiple ML models trained on historical event data
4. **Real-time Testing**: Live prediction testing with performance monitoring
5. **Dashboard Visualization**: Real-time results displayed in web interface

### Key Data Paths

- `data/raw/`: Raw collected data and system status files
- `data/processed/`: Preprocessed datasets and enhanced features
- `data/models/`: Trained model files (`.pkl`, `.h5`)
- `results/`: Analysis results, visualizations, and reports
- `docs/reports/`: Generated comprehensive reports

### Technology Stack

- **Python**: Core ML pipeline (pandas, scikit-learn, TensorFlow, SHAP)
- **JavaScript**: Dashboard frontend with ES6+ modules
- **Data Sources**: yfinance for stock data, NewsAPI for sentiment analysis
- **Models**: Random Forest, Gradient Boosting, LSTM, XGBoost
- **Visualization**: Chart.js (frontend), matplotlib/plotly (backend)

### System Entry Points

- **Full Pipeline**: Run `system_orchestrator.py` for complete automated execution
- **Model Training Only**: Run `model_training.py` for training models
- **Dashboard**: Start `dashboard/server.py` for web interface
- **Real-time Testing**: Run `run_realtime_test.py` for live predictions

### Important Notes

- GPU detection is automatically handled by the system orchestrator
- System generates comprehensive logs in `data/raw/` directory
- Dashboard connects to data files in `../data/raw/` for real-time updates
- All models support both batch and real-time prediction modes
- The system includes data validation and quality checking mechanisms