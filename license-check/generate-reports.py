try:
    import pandas as pd
    import openpyxl
except ImportError:
    import sys
    import subprocess
    print("Installing required packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "openpyxl"])
    import pandas as pd
    import openpyxl
import json

def main():
    output_dir = './license-reports'

    try:
        with open(f'{output_dir}/nuget-licenses.json', 'r') as f:
            nuget_data = json.load(f)
    except FileNotFoundError:
        nuget_data = []

    try:
        rush_data = pd.read_csv(f'{output_dir}/rush-dependencies.csv')
    except FileNotFoundError:
        rush_data = pd.DataFrame()

    with pd.ExcelWriter(f'{output_dir}/license-report.xlsx') as writer:
        if nuget_data:
            nuget_df = pd.json_normalize(nuget_data)
            nuget_df.to_excel(writer, sheet_name='NuGet Packages', index=False)
        if not rush_data.empty:
            rush_data.to_excel(writer, sheet_name='Rush Dependencies', index=False)

    print(f"Excel report generated at {output_dir}/license-report.xlsx")

if __name__ == "__main__":
    main()