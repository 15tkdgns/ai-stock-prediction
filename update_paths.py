#!/usr/bin/env python3
"""
Update file paths in all Python files to reflect new folder structure
"""

import os
import re
import glob

def update_file_paths():
    """Update all file paths in Python files"""
    
    # Path mappings for the new structure
    path_mappings = {
        'raw_data/': 'data/raw/',
        'data/models/': 'data/models/',
        'docs/reports/': 'docs/reports/',
        'results/analysis/': 'results/analysis/',
        'config/': 'config/',
        'src/': 'src/',
        
        # Import path updates
        'from data_collection_pipeline import': 'from src.core.data_collection_pipeline import',
        'from api_config import': 'from src.core.api_config import',
        'from advanced_preprocessing import': 'from src.core.advanced_preprocessing import',
        'import data_collection_pipeline': 'import src.core.data_collection_pipeline',
        'import api_config': 'import src.core.api_config',
        
        # File references
        "'training_features.csv'": "'data/raw/training_features.csv'",
        "'event_labels.csv'": "'data/raw/event_labels.csv'",
        "'model_performance.json'": "'data/raw/model_performance.json'",
        "'training_summary.json'": "'data/raw/training_summary.json'",
        "'realtime_test_results.json'": "'data/raw/realtime_test_results.json'",
        "'sp500_constituents.csv'": "'data/raw/sp500_constituents.csv'",
        "'news_data.csv'": "'data/raw/news_data.csv'",
        "'validation_report.json'": "'data/raw/validation_report.json'",
        
        # Model files
        "'gradient_boosting_model.pkl'": "'data/models/gradient_boosting_model.pkl'",
        "'random_forest_model.pkl'": "'data/models/random_forest_model.pkl'",
        "'lstm_model.h5'": "'data/models/lstm_model.h5'",
        "'scaler.pkl'": "'data/models/scaler.pkl'",
        
        # Result files
        "'TRAINING_REPORT.md'": "'docs/reports/TRAINING_REPORT.md'",
        "'REALTIME_TEST_REPORT.md'": "'docs/reports/REALTIME_TEST_REPORT.md'",
        "'COMPREHENSIVE_MODEL_REPORT.md'": "'docs/reports/COMPREHENSIVE_MODEL_REPORT.md'",
        "'training_visualization.png'": "'results/analysis/training_visualization.png'",
        "'realtime_test_visualization.png'": "'results/analysis/realtime_test_visualization.png'",
        "'comprehensive_model_analysis.png'": "'results/analysis/comprehensive_model_analysis.png'",
        "'feature_importance.png'": "'results/analysis/feature_importance.png'",
        
        # Directory references
        "f'{self.data_dir}/": "f'{self.data_dir}/",
        "data_dir='raw_data'": "data_dir='data/raw'",
        "data_dir='data'": "data_dir='data/raw'",
    }
    
    # Find all Python files
    python_files = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    print(f"Found {len(python_files)} Python files to update")
    
    updated_files = []
    
    for file_path in python_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Apply path mappings
            for old_path, new_path in path_mappings.items():
                content = content.replace(old_path, new_path)
            
            # Update relative imports for files in subdirectories
            if file_path.startswith('./src/'):
                # Add relative path adjustments
                content = re.sub(r"pd\.read_csv\('([^']+)'\)", r"pd.read_csv('../../\1')", content)
                content = re.sub(r"open\('([^']+)'", r"open('../../\1'", content)
                content = re.sub(r"joblib\.load\('([^']+)'\)", r"joblib.load('../../\1')", content)
                content = re.sub(r"joblib\.dump\([^,]+,\s*'([^']+)'\)", lambda m: m.group(0).replace(m.group(1), '../../' + m.group(1)), content)
                
                # Fix over-corrections
                content = content.replace('../../data/raw/', 'data/raw/')
                content = content.replace('../../data/models/', 'data/models/')
                content = content.replace('../../docs/reports/', 'docs/reports/')
                content = content.replace('../../results/analysis/', 'results/analysis/')
                content = content.replace('../../config/', 'config/')
            
            # Write back if changed
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                updated_files.append(file_path)
                print(f"Updated: {file_path}")
                
        except Exception as e:
            print(f"Error updating {file_path}: {e}")
    
    print(f"\nUpdated {len(updated_files)} files")
    return updated_files

if __name__ == "__main__":
    print("🔄 Updating file paths in project files...")
    updated_files = update_file_paths()
    print("✅ Path updates complete!")