import os
from openai import OpenAI
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()
# print("MYSQL_USER:", os.environ.get("MYSQL_USER"))
# print("MYSQL_HOST:", os.environ.get("MYSQL_HOST"))
# print("MYSQL_DATABASE:", os.environ.get("MYSQL_DATABASE"))

engine = create_engine(
    f"mysql+mysqlconnector://{os.environ['MYSQL_USER']}:{os.environ['MYSQL_PASSWORD']}"
    f"@{os.environ['MYSQL_HOST']}/{os.environ['MYSQL_DATABASE']}"
)

client = OpenAI(
    api_key=os.environ["GEMINI_API_KEY_1"],
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/")