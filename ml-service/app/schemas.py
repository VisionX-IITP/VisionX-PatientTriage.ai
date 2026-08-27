from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    age: int = Field(ge=0, le=120)
    heart_rate: int = Field(ge=20, le=250)
    systolic_bp: int = Field(ge=40, le=260)
    diastolic_bp: int = Field(ge=20, le=180)
    spo2: int = Field(ge=40, le=100)
    respiratory_rate: int = Field(ge=4, le=60)
    temperature: float = Field(ge=30.0, le=43.0)
    pain_score: int = Field(ge=0, le=10)
    waiting_minutes: int = Field(ge=0, le=1440)

class PredictResponse(BaseModel):
    risk_probability: float
    risk_level: str
    model_version: str
    key_factors: list
