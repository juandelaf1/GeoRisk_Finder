"""
Script completo para loggear TODO el proyecto a MLflow.
Ejecuta: python scripts/log_all_to_mlflow.py
"""
import mlflow
import mlflow.sklearn
import os
import json
import subprocess
import sys
from pathlib import Path

mlflow.set_tracking_uri("sqlite:///mlflow.db")

PROJECT_ROOT = Path(__file__).parent.parent

def log_artifacts_from_dir(experiment_name, local_dir, artifact_path=None):
    """Log all files in a directory as artifacts."""
    mlflow.set_experiment(experiment_name)
    with mlflow.start_run(run_name=f"artifact_dump_{experiment_name}") as run:
        if os.path.exists(local_dir):
            mlflow.log_artifacts(local_dir, artifact_path=artifact_path)
            print(f"Logged {local_dir} to {experiment_name}")
        else:
            print(f"Directory not found: {local_dir}")

def log_notebooks():
    """Log all notebooks as artifacts."""
    mlflow.set_experiment("notebooks")
    with mlflow.start_run(run_name="notebook_artifacts") as run:
        notebooks_dir = PROJECT_ROOT / "notebooks"
        if notebooks_dir.exists():
            for nb in notebooks_dir.glob("*.ipynb"):
                mlflow.log_artifact(str(nb), artifact_path="notebooks")
                print(f"Logged notebook: {nb.name}")

def log_data_files():
    """Log all processed data files."""
    mlflow.set_experiment("data_artifacts")
    with mlflow.start_run(run_name="data_artifacts") as run:
        data_dir = PROJECT_ROOT / "data" / "processed"
        if data_dir.exists():
            for f in data_dir.glob("*.csv"):
                mlflow.log_artifact(str(f), artifact_path="data/processed")
                print(f"Logged data: {f.name}")

def log_models():
    """Log model artifacts."""
    mlflow.set_experiment("models")
    with mlflow.start_run(run_name="model_artifacts") as run:
        models_dir = PROJECT_ROOT / "models"
        if models_dir.exists():
            for f in models_dir.glob("*"):
                if f.is_file():
                    mlflow.log_artifact(str(f), artifact_path="models")
                    print(f"Logged model: {f.name}")

def log_scripts():
    """Log all scripts."""
    mlflow.set_experiment("scripts")
    with mlflow.start_run(run_name="script_artifacts") as run:
        scripts_dir = PROJECT_ROOT / "scripts"
        if scripts_dir.exists():
            for f in scripts_dir.glob("*.py"):
                mlflow.log_artifact(str(f), artifact_path="scripts")
                print(f"Logged script: {f.name}")

def log_src_modules():
    """Log source code modules."""
    mlflow.set_experiment("source_code")
    with mlflow.start_run(run_name="source_code") as run:
        src_dir = PROJECT_ROOT / "src"
        if src_dir.exists():
            for f in src_dir.rglob("*.py"):
                mlflow.log_artifact(str(f), artifact_path="src")
                print(f"Logged src: {f.relative_to(PROJECT_ROOT)}")

def log_docs():
    """Log documentation."""
    mlflow.set_experiment("documentation")
    with mlflow.start_run(run_name="docs") as run:
        for f in PROJECT_ROOT.glob("*.md"):
            mlflow.log_artifact(str(f), artifact_path="docs")
        docs_dir = PROJECT_ROOT / "docs"
        if docs_dir.exists():
            for f in docs_dir.rglob("*.md"):
                mlflow.log_artifact(str(f), artifact_path="docs")

def log_configs():
    """Log config files."""
    mlflow.set_experiment("config")
    with mlflow.start_run(run_name="configs") as run:
        for f in PROJECT_ROOT.glob("*.txt"):
            mlflow.log_artifact(str(f), artifact_path="config")
        for f in PROJECT_ROOT.glob("*.yaml"):
            mlflow.log_artifact(str(f), artifact_path="config")
        for f in PROJECT_ROOT.glob("*.yml"):
            mlflow.log_artifact(str(f), artifact_path="config")
        req_files = list(PROJECT_ROOT.glob("requirements*.txt"))
        for f in req_files:
            mlflow.log_artifact(str(f), artifact_path="config")

def main():
    print("=== Logging EVERYTHING to MLflow ===")
    
    # Core MLflow tracking
    mlflow.set_tracking_uri("sqlite:///mlflow.db")
    
    # Log everything
    log_notebooks()
    log_data_files()
    log_models()
    log_scripts()
    log_src_modules()
    log_docs()
    log_configs()
    
    print("\n=== DONE: Everything logged to MLflow ===")
    print("Run 'mlflow ui' to view at http://127.0.0.1:5000")

if __name__ == "__main__":
    main()