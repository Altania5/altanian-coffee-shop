"""
Altanian Coffee - Optuna-Based Dial-In Optimizer
=================================================

Bayesian optimization engine for espresso parameter optimization.
Uses Optuna with PostgreSQL storage to learn and recommend optimal
parameters for each coffee bean and brewing method combination.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import optuna
from optuna.storages import RDBStorage
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Altanian Coffee Dial-In Optimizer",
    description="Bayesian optimization for espresso parameter tuning",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "optuna_db")

DB_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# ============================================
# PYDANTIC MODELS
# ============================================

class ShotData(BaseModel):
    """Model for shot data input"""
    bean_id: str = Field(..., description="Unique ID for the coffee bean/bag")
    user_id: Optional[str] = Field(None, description="User ID for personalization")
    method: str = Field(default="espresso", description="Brewing method")
    grind: Optional[float] = Field(None, ge=1.0, le=25.0, description="Grind size setting")
    dose: Optional[float] = Field(None, ge=14.0, le=22.0, description="Coffee dose in grams")
    time: Optional[float] = Field(None, ge=20.0, le=40.0, description="Extraction time in seconds")
    taste_score: Optional[float] = Field(None, ge=0.0, le=10.0, description="Taste score (0-10, 10 is best)")

    @validator('method')
    def validate_method(cls, v):
        allowed_methods = ['espresso', 'ristretto', 'lungo']
        if v not in allowed_methods:
            raise ValueError(f'Method must be one of: {", ".join(allowed_methods)}')
        return v

class RecommendationResponse(BaseModel):
    """Response model for optimization recommendations"""
    study_name: str
    trial_number: int
    recommendation: Dict[str, float]
    best_so_far: Optional[Dict[str, Any]]
    total_trials: int
    message: str

class ReportData(BaseModel):
    """Model for reporting trial results"""
    bean_id: str
    user_id: Optional[str] = None
    method: str = "espresso"
    trial_number: int
    taste_score: float = Field(..., ge=0.0, le=10.0)

# ============================================
# HELPER FUNCTIONS
# ============================================

def get_storage():
    """Get Optuna storage with connection retry logic"""
    try:
        storage = RDBStorage(
            url=DB_URL,
            engine_kwargs={
                "pool_pre_ping": True,  # Check connection health
                "pool_recycle": 3600,   # Recycle connections every hour
            }
        )
        return storage
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed: {str(e)}"
        )

def get_study_name(bean_id: str, user_id: Optional[str], method: str) -> str:
    """Generate a unique study name for bean + user + method combination"""
    if user_id:
        return f"user_{user_id}_bean_{bean_id}_{method}"
    return f"bean_{bean_id}_{method}"

def get_or_create_study(study_name: str, storage: RDBStorage):
    """Get existing study or create new one"""
    try:
        study = optuna.create_study(
            study_name=study_name,
            storage=storage,
            load_if_exists=True,
            direction="maximize"  # Maximize taste score
        )
        logger.info(f"Loaded/created study: {study_name} with {len(study.trials)} trials")
        return study
    except Exception as e:
        logger.error(f"Failed to create/load study: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create study: {str(e)}"
        )

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/")
def root():
    """Root endpoint with API information"""
    return {
        "name": "Altanian Coffee Dial-In Optimizer",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "GET /health": "Health check",
            "POST /optimize/next-shot": "Get next parameter recommendation",
            "POST /optimize/report": "Report trial results",
            "GET /optimize/status/{bean_id}": "Get optimization status for a bean",
            "GET /optimize/best/{bean_id}": "Get best parameters found so far"
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        storage = get_storage()

        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.post("/optimize/next-shot", response_model=RecommendationResponse)
async def recommend_next_shot(data: ShotData):
    """
    Get next recommended parameters using Bayesian optimization.

    If taste_score is provided, it will be recorded for the previous recommendation
    before generating the next one.
    """
    try:
        # Get storage and study
        storage = get_storage()
        study_name = get_study_name(data.bean_id, data.user_id, data.method)
        study = get_or_create_study(study_name, storage)

        # If this is feedback for a previous shot, record it
        if data.taste_score is not None and data.grind is not None:
            logger.info(f"Recording feedback: grind={data.grind}, dose={data.dose}, time={data.time}, score={data.taste_score}")

            # Create a trial with the provided parameters and score
            # We use enqueue_trial to add it as a completed trial
            trial = study.ask()

            # Override the suggested parameters with the actual ones used
            trial.set_user_attr("grind", data.grind)
            trial.set_user_attr("dose", data.dose)
            trial.set_user_attr("time", data.time)

            # Report the result
            study.tell(trial, data.taste_score)

            logger.info(f"Recorded trial {trial.number} with score {data.taste_score}")

        # Generate next recommendation
        trial = study.ask()

        # Define search space with reasonable ranges
        rec_grind = trial.suggest_float("grind", 1.0, 25.0, step=0.5)
        rec_dose = trial.suggest_float("dose", 14.0, 22.0, step=0.1)
        rec_time = trial.suggest_float("time", 20.0, 40.0, step=1.0)

        # Get best trial so far (if any)
        best_info = None
        if len(study.trials) > 0 and study.best_trial:
            best_trial = study.best_trial
            best_info = {
                "trial_number": best_trial.number,
                "parameters": best_trial.params,
                "score": best_trial.value,
                "timestamp": best_trial.datetime_complete.isoformat() if best_trial.datetime_complete else None
            }

        # Create response
        response = RecommendationResponse(
            study_name=study_name,
            trial_number=trial.number,
            recommendation={
                "grind": round(rec_grind, 1),
                "dose": round(rec_dose, 1),
                "target_time": round(rec_time, 1)
            },
            best_so_far=best_info,
            total_trials=len(study.trials),
            message=f"Trial #{trial.number}: Adjust your machine to these settings and report back!"
        )

        logger.info(f"Generated recommendation for trial {trial.number}: {response.recommendation}")

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Optimization error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Optimization failed: {str(e)}"
        )

@app.post("/optimize/report")
async def report_result(data: ReportData):
    """
    Report the result of a specific trial.
    This is an alternative to including the score in the next-shot request.
    """
    try:
        storage = get_storage()
        study_name = get_study_name(data.bean_id, data.user_id, data.method)

        # Load the study
        study = optuna.load_study(
            study_name=study_name,
            storage=storage
        )

        # Find the trial by number
        trial = None
        for t in study.trials:
            if t.number == data.trial_number:
                trial = t
                break

        if trial is None:
            raise HTTPException(
                status_code=404,
                detail=f"Trial {data.trial_number} not found in study {study_name}"
            )

        # Check if trial is already complete
        if trial.state == optuna.trial.TrialState.COMPLETE:
            logger.warning(f"Trial {data.trial_number} already completed with score {trial.value}")
            return {
                "status": "already_completed",
                "trial_number": data.trial_number,
                "existing_score": trial.value,
                "message": "This trial was already completed"
            }

        # Update the trial with the score
        study.tell(trial, data.taste_score)

        logger.info(f"Reported result for trial {data.trial_number}: score={data.taste_score}")

        # Get current best
        best_trial = study.best_trial

        return {
            "status": "success",
            "trial_number": data.trial_number,
            "score": data.taste_score,
            "current_best": {
                "trial_number": best_trial.number,
                "parameters": best_trial.params,
                "score": best_trial.value
            },
            "total_trials": len(study.trials),
            "message": f"Updated trial {data.trial_number} with score {data.taste_score}"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to report result: {str(e)}"
        )

@app.get("/optimize/status/{bean_id}")
async def get_optimization_status(
    bean_id: str,
    user_id: Optional[str] = None,
    method: str = "espresso"
):
    """
    Get optimization status for a specific bean/user/method combination.
    """
    try:
        storage = get_storage()
        study_name = get_study_name(bean_id, user_id, method)

        try:
            study = optuna.load_study(
                study_name=study_name,
                storage=storage
            )
        except KeyError:
            # Study doesn't exist yet
            return {
                "status": "not_started",
                "study_name": study_name,
                "total_trials": 0,
                "message": "No optimization data yet. Start by requesting your first recommendation."
            }

        # Get best trial
        best_trial = None
        if len(study.trials) > 0 and study.best_trial:
            bt = study.best_trial
            best_trial = {
                "trial_number": bt.number,
                "parameters": bt.params,
                "score": bt.value,
                "timestamp": bt.datetime_complete.isoformat() if bt.datetime_complete else None
            }

        # Get recent trials
        recent_trials = []
        for trial in list(study.trials)[-5:]:  # Last 5 trials
            if trial.state == optuna.trial.TrialState.COMPLETE:
                recent_trials.append({
                    "trial_number": trial.number,
                    "parameters": trial.params,
                    "score": trial.value
                })

        return {
            "status": "active",
            "study_name": study_name,
            "total_trials": len(study.trials),
            "best_trial": best_trial,
            "recent_trials": recent_trials,
            "message": f"Optimization in progress with {len(study.trials)} trials completed"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get status: {str(e)}"
        )

@app.get("/optimize/best/{bean_id}")
async def get_best_parameters(
    bean_id: str,
    user_id: Optional[str] = None,
    method: str = "espresso"
):
    """
    Get the best parameters found so far for a specific bean.
    """
    try:
        storage = get_storage()
        study_name = get_study_name(bean_id, user_id, method)

        try:
            study = optuna.load_study(
                study_name=study_name,
                storage=storage
            )
        except KeyError:
            raise HTTPException(
                status_code=404,
                detail=f"No optimization data found for {study_name}"
            )

        if len(study.trials) == 0:
            raise HTTPException(
                status_code=404,
                detail="No trials completed yet"
            )

        best_trial = study.best_trial

        return {
            "study_name": study_name,
            "best_trial": {
                "trial_number": best_trial.number,
                "parameters": {
                    "grind": round(best_trial.params.get("grind", 0), 1),
                    "dose": round(best_trial.params.get("dose", 0), 1),
                    "time": round(best_trial.params.get("time", 0), 1)
                },
                "score": best_trial.value,
                "timestamp": best_trial.datetime_complete.isoformat() if best_trial.datetime_complete else None
            },
            "total_trials": len(study.trials),
            "message": f"Best parameters found after {len(study.trials)} trials"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Best parameters error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get best parameters: {str(e)}"
        )

# ============================================
# STARTUP
# ============================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info("="*60)
    logger.info("Altanian Coffee Dial-In Optimizer Starting...")
    logger.info("="*60)
    logger.info(f"Database URL: {DB_URL.replace(DB_PASSWORD, '***')}")

    # Test database connection
    try:
        storage = get_storage()
        logger.info("✅ Database connection successful!")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        logger.error("The service will start but optimization endpoints will fail until database is available")

    logger.info("="*60)

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    logger.info(f"Starting server on {host}:{port}")

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,  # Set to True for development
        log_level="info"
    )
