import os
import json
import threading
import time
from datetime import datetime
import logging
import sys
import pandas as pd  # pandas import 추가



from src.testing.validation_checker import DataValidationChecker
from src.analysis.xai_monitoring import XAIMonitoringSystem
from src.testing.realtime_testing_system import RealTimeTestingSystem
from src.features.llm_feature_extractor import extract_llm_features

import tensorflow as tf


class SystemOrchestrator:
    def __init__(self, data_dir="../../data/raw"):
        self.data_dir = os.path.abspath(data_dir)
        self.components = {}
        self.status = {
            "validation": "not_started",
            "xai_monitoring": "not_started",
            "realtime_testing": "not_started",
            "overall_health": "unknown",
        }

        # 로깅 설정
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler(f"{data_dir}/system_orchestrator.log"),
                logging.StreamHandler(),
            ],
        )
        self.logger = logging.getLogger(__name__)
        self.check_gpu()

    def check_gpu(self):
        """GPU 사용 가능 여부 확인"""
        gpus = tf.config.list_physical_devices("GPU")
        if gpus:
            self.logger.info(f"✅ GPU 장치 감지: {gpus}")
        else:
            self.logger.warning("⚠️ GPU 장치를 찾을 수 없습니다. CPU로 실행됩니다.")

    def initialize_components(self):
        """모든 컴포넌트 초기화"""
        self.logger.info("시스템 컴포넌트 초기화 시작")

        try:
            # 데이터 검증 컴포넌트
            self.components["validator"] = DataValidationChecker(self.data_dir)
            self.logger.info("✅ 데이터 검증 컴포넌트 초기화 완료")

            # XAI 모니터링 컴포넌트
            self.components["xai_monitor"] = XAIMonitoringSystem(self.data_dir)
            self.logger.info("✅ XAI 모니터링 컴포넌트 초기화 완료")

            # 실시간 테스트 컴포넌트
            self.components["realtime_tester"] = RealTimeTestingSystem(self.data_dir)
            self.logger.info("✅ 실시간 테스트 컴포넌트 초기화 완료")

            return True

        except Exception as e:
            self.logger.error(f"컴포넌트 초기화 실패: {e}")
            return False

    def _run_llm_feature_extraction(self):
        """LLM 특징 추출 실행"""
        self.logger.info("LLM 특징 추출 시작")
        try:
            # news_sentiment_data.csv 로드
            news_data_path = os.path.join(self.data_dir, "news_sentiment_data.csv")
            if not os.path.exists(news_data_path):
                self.logger.error(
                    f"뉴스 감성 데이터 파일을 찾을 수 없습니다: {news_data_path}"
                )
                return False

            news_df = pd.read_csv(news_data_path)

            # LLM 특징 추출
            llm_enhanced_features = extract_llm_features(news_df)

            # 추출된 특징 저장
            output_path = os.path.join(
                self.data_dir.replace("raw", "processed"), "llm_enhanced_features.csv"
            )
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            llm_enhanced_features.to_csv(output_path, index=False)

            self.logger.info(f"✅ LLM 특징 추출 완료 및 저장: {output_path}")
            return True
        except Exception as e:
            self.logger.error(f"LLM 특징 추출 중 오류: {e}")
            return False

    def run_system_validation(self):
        """시스템 전체 검증"""
        self.logger.info("시스템 검증 시작")
        self.status["validation"] = "running"

        try:
            validator = self.components["validator"]
            validation_report = validator.generate_validation_report()

            if validation_report["overall_status"] == "PASS":
                self.status["validation"] = "passed"
                self.logger.info("✅ 시스템 검증 통과")
                return True
            else:
                self.status["validation"] = "failed"
                self.logger.error("❌ 시스템 검증 실패")
                return False

        except Exception as e:
            self.status["validation"] = "error"
            self.logger.error(f"시스템 검증 중 오류: {e}")
            return False

    def run_xai_monitoring(self):
        """XAI 모니터링 실행"""
        self.logger.info("XAI 모니터링 시작")
        self.status["xai_monitoring"] = "running"

        try:
            xai_monitor = self.components["xai_monitor"]
            dashboard = xai_monitor.run_full_monitoring()

            if dashboard:
                self.status["xai_monitoring"] = "active"
                self.logger.info("✅ XAI 모니터링 활성화")
                return True
            else:
                self.status["xai_monitoring"] = "failed"
                self.logger.error("❌ XAI 모니터링 실패")
                return False

        except Exception as e:
            self.status["xai_monitoring"] = "error"
            self.logger.error(f"XAI 모니터링 중 오류: {e}")
            return False

    def start_realtime_testing(self):
        """실시간 테스트 시작"""
        self.logger.info("실시간 테스트 시작")
        self.status["realtime_testing"] = "starting"

        try:
            realtime_tester = self.components["realtime_tester"]

            if realtime_tester.start_testing():
                self.status["realtime_testing"] = "running"
                self.logger.info("✅ 실시간 테스트 시작됨")
                return True
            else:
                self.status["realtime_testing"] = "failed"
                self.logger.error("❌ 실시간 테스트 시작 실패")
                return False

        except Exception as e:
            self.status["realtime_testing"] = "error"
            self.logger.error(f"실시간 테스트 시작 중 오류: {e}")
            return False

    def monitor_system_health(self):
        """시스템 헬스 모니터링"""
        while True:
            try:
                # 전체 상태 평가
                healthy_components = 0
                total_components = 0

                for component, status in self.status.items():
                    if component != "overall_health":
                        total_components += 1
                        if status in ["passed", "active", "running"]:
                            healthy_components += 1

                # 전체 헬스 상태 결정
                if healthy_components == total_components:
                    self.status["overall_health"] = "healthy"
                elif healthy_components > 0:
                    self.status["overall_health"] = "degraded"
                else:
                    self.status["overall_health"] = "unhealthy"

                # 상태 저장
                status_report = {
                    "timestamp": datetime.now().isoformat(),
                    "status": self.status,
                    "components": {
                        name: comp.__class__.__name__
                        for name, comp in self.components.items()
                    },
                }

                with open(f"{self.data_dir}/system_status.json", "w") as f:
                    json.dump(status_report, f, indent=2)

                # 상태 로그
                if self.status["overall_health"] == "healthy":
                    self.logger.info("✅ 시스템 상태: 정상")
                elif self.status["overall_health"] == "degraded":
                    self.logger.warning("⚠️ 시스템 상태: 일부 문제")
                else:
                    self.logger.error("❌ 시스템 상태: 비정상")

                time.sleep(300)  # 5분마다 체크

            except Exception as e:
                self.logger.error(f"헬스 모니터링 오류: {e}")
                time.sleep(60)  # 오류 시 1분 대기

    def run_full_pipeline(self):
        """전체 파이프라인 실행"""
        self.logger.info("=== S&P500 이벤트 탐지 시스템 시작 ===")

        # 1. 컴포넌트 초기화
        if not self.initialize_components():
            return False

        # 2. LLM 특징 추출 (새로운 단계 추가)
        if not self._run_llm_feature_extraction():
            self.logger.error("LLM 특징 추출 실패로 인해 중단됨")
            return False

        # 3. 시스템 검증 (기존 2단계)
        if not self.run_system_validation():
            self.logger.error("시스템 검증 실패로 인해 중단됨")
            return False

        # 4. XAI 모니터링 실행 (기존 3단계)
        if not self.run_xai_monitoring():
            self.logger.warning("XAI 모니터링 실패, 계속 진행")

        # 5. 실시간 테스트 시작 (기존 4단계)
        if not self.start_realtime_testing():
            self.logger.error("실시간 테스트 시작 실패")
            return False

        # 6. 헬스 모니터링 시작 (별도 스레드) (기존 5단계)
        health_thread = threading.Thread(target=self.monitor_system_health)
        health_thread.daemon = True
        health_thread.start()

        self.logger.info("=== 시스템 완전 가동 ===")
        return True

    def stop_system(self):
        """시스템 중지"""
        self.logger.info("시스템 중지 시작")

        try:
            # 실시간 테스트 중지
            if "realtime_tester" in self.components:
                self.components["realtime_tester"].stop_testing()

            # 상태 업데이트
            self.status["realtime_testing"] = "stopped"
            self.status["overall_health"] = "stopped"

            self.logger.info("✅ 시스템 중지 완료")
            return True

        except Exception as e:
            self.logger.error(f"시스템 중지 중 오류: {e}")
            return False

    def get_system_status(self):
        """현재 시스템 상태 반환"""
        return {
            "status": self.status,
            "components": list(self.components.keys()),
            "timestamp": datetime.now().isoformat(),
        }


if __name__ == "__main__":
    # 시스템 오케스트레이터 실행
    orchestrator = SystemOrchestrator()

    if orchestrator.run_full_pipeline():
        print("시스템이 성공적으로 시작되었습니다.")
        print("시스템 상태는 raw_data/system_status.json에서 확인할 수 있습니다.")
        print("종료하려면 Ctrl+C를 누르세요.")

        try:
            while True:
                time.sleep(10)
                status = orchestrator.get_system_status()
                print(f"현재 상태: {status['status']['overall_health']}")

        except KeyboardInterrupt:
            print("\n시스템 중지 중...")
            orchestrator.stop_system()
            print("시스템이 중지되었습니다.")
    else:
        print("시스템 시작 실패")
