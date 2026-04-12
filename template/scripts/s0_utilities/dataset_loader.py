"""
Dataset loading and management utilities.

Provides config-driven data loading from datasets.json and path helpers
for the project's datas/ directory tree.

datasets.json schema
--------------------
Each entry in the JSON array describes one raw dataset::

    [
        {
            "filename": "raw_file.xlsx",       # file in datas/raw_data/
            "alias": "short_name",             # used as output dir name
            "exclude_columns": [0, 1, 2],      # column indices to drop
            "label_column": -1,                # label index (-1 = last column)
            "description": "optional note"     # human-readable description (optional)
        }
    ]

Typical usage in a preprocessing script::

    from scripts.s0_utilities.dataset_loader import (
        load_datasets_config,
        load_raw_dataframe,
        get_dataset_dir,
    )

    for cfg in load_datasets_config():
        df, labels = load_raw_dataframe(cfg)
        # ... apply transformations ...
        out_dir = get_dataset_dir(cfg["alias"])
        df.to_csv(out_dir / f"{cfg['alias']}.csv", index=False)
"""

import json
import sys
from pathlib import Path
from typing import TypedDict

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASETS_CONFIG_PATH = PROJECT_ROOT / "datas" / "raw_data" / "datasets.json"
RAW_DATA_DIR = PROJECT_ROOT / "datas" / "raw_data"
DATA_DIR = PROJECT_ROOT / "datas" / "data"
OUTPUT_DIR = PROJECT_ROOT / "datas" / "output"
ASSETS_DIR = PROJECT_ROOT / "datas" / "assets"


class DatasetConfig(TypedDict, total=False):
    """
    Schema for a single dataset entry in datasets.json.

    Required keys: filename, alias.
    Optional keys: exclude_columns, label_column, description.
    """

    filename: str
    alias: str
    exclude_columns: list[int]
    label_column: int
    description: str


def load_datasets_config(
    config_path: Path = DATASETS_CONFIG_PATH,
) -> list[DatasetConfig]:
    """
    Load dataset configurations from datasets.json.

    Args:
        config_path: Path to the datasets.json configuration file.

    Returns:
        List of dataset configuration dictionaries.
    """
    try:
        with open(config_path, encoding="utf-8") as f:
            configs: list[DatasetConfig] = json.load(f)
        print(f"Loaded configuration for {len(configs)} dataset(s)")
        return configs
    except FileNotFoundError:
        print(f"Error: Configuration file not found at {config_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in configuration file: {e}")
        sys.exit(1)


def get_dataset_dir(alias: str, subdir: str = "data") -> Path:
    """
    Get the directory path for a dataset by its alias, creating it if needed.

    Args:
        alias: Dataset alias as defined in datasets.json.
        subdir: Subdirectory under datas/ ("raw_data", "data", or "output").

    Returns:
        Path to the dataset directory.
    """
    path = PROJECT_ROOT / "datas" / subdir / alias
    path.mkdir(parents=True, exist_ok=True)
    return path


def load_raw_dataframe(
    config: DatasetConfig,
) -> tuple[pd.DataFrame, pd.Series]:
    """
    Load a raw data file and apply column exclusion and label extraction.

    Supports .xlsx, .xls, and .csv files.  Drops columns listed in
    ``exclude_columns``, then separates the label column (index given by
    ``label_column``, default -1 = last column).

    Args:
        config: A single dataset configuration from datasets.json.

    Returns:
        A tuple of (features_dataframe, label_series).

    Raises:
        FileNotFoundError: If the raw data file does not exist.
        ValueError: If the configuration is missing required keys.
    """
    filename = config.get("filename")
    if not filename:
        raise ValueError("Dataset config missing 'filename' key")

    raw_path = RAW_DATA_DIR / filename
    if not raw_path.exists():
        raise FileNotFoundError(f"Raw data file not found: {raw_path}")

    if filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(raw_path)
    else:
        df = pd.read_csv(raw_path)

    exclude = config.get("exclude_columns", [])
    if exclude:
        cols_to_drop = [df.columns[i] for i in exclude if i < len(df.columns)]
        df = df.drop(columns=cols_to_drop)

    label_idx = config.get("label_column", -1)
    label_col = df.columns[label_idx]
    labels = df[label_col]
    df = df.drop(columns=[label_col])

    return df, labels


def load_dataset(alias: str, filename: str | None = None) -> pd.DataFrame:
    """
    Load a processed dataset CSV by its alias.

    If filename is not provided, defaults to "<alias>.csv" under datas/data/<alias>/.

    Args:
        alias: Dataset alias as defined in datasets.json.
        filename: Optional specific filename to load.

    Returns:
        DataFrame containing the loaded dataset.
    """
    dataset_dir = DATA_DIR / alias
    target = dataset_dir / (filename or f"{alias}.csv")
    return pd.read_csv(target)
