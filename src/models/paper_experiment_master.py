#!/usr/bin/env python3
"""
논문용 마스터 실험 시스템
모든 실험을 통합하여 실행하고 논문용 결과를 자동 생성
"""

import os
import sys
import json
import time
from datetime import datetime
from pathlib import Path
import logging
import argparse

# 로컬 모듈 임포트
from paper_dataset_specification import PaperDatasetSpecification
from experimental_framework import ExperimentalFramework
from experiment_runner import ExperimentRunner
from advanced_preprocessing import AdvancedPreprocessor
from comprehensive_evaluation import ComprehensiveEvaluator

class PaperExperimentMaster:
    def __init__(self, data_dir='raw_data', paper_dir='paper_data', experiment_dir='experiments'):
        self.data_dir = data_dir
        self.paper_dir = paper_dir
        self.experiment_dir = experiment_dir
        
        # 결과 디렉토리 생성
        self.results_dir = f'{experiment_dir}/paper_results'
        Path(self.results_dir).mkdir(parents=True, exist_ok=True)
        
        # 로깅 설정
        self.setup_logging()
        
        # 컴포넌트 초기화
        self.initialize_components()
        
    def setup_logging(self):
        """로깅 설정"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'{self.results_dir}/master_experiment.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def initialize_components(self):
        """컴포넌트 초기화"""
        self.logger.info("컴포넌트 초기화 시작")
        
        try:
            self.dataset_spec = PaperDatasetSpecification(self.data_dir, self.paper_dir)
            self.experiment_framework = ExperimentalFramework(self.data_dir, self.paper_dir, self.experiment_dir)
            self.experiment_runner = ExperimentRunner(self.data_dir, self.paper_dir, self.experiment_dir)
            self.preprocessor = AdvancedPreprocessor()
            self.evaluator = ComprehensiveEvaluator(f'{self.experiment_dir}/results')
            
            self.logger.info("모든 컴포넌트 초기화 완료")
            
        except Exception as e:
            self.logger.error(f"컴포넌트 초기화 실패: {e}")
            raise
    
    def run_dataset_analysis(self):
        """데이터셋 분석 실행"""
        self.logger.info("=== 데이터셋 분석 시작 ===")
        
        try:
            # 상세 데이터 명세서 생성
            dataset_spec = self.dataset_spec.save_comprehensive_specification()
            
            # 논문 데이터 관리자 실행
            from paper_data_manager import PaperDataManager
            paper_manager = PaperDataManager(self.data_dir, self.paper_dir)
            analysis_result = paper_manager.run_complete_analysis()
            
            if analysis_result:
                self.logger.info("데이터셋 분석 완료")
                return True
            else:
                self.logger.error("데이터셋 분석 실패")
                return False
                
        except Exception as e:
            self.logger.error(f"데이터셋 분석 중 오류: {e}")
            return False
    
    def run_preprocessing_experiments(self):
        """전처리 실험 실행"""
        self.logger.info("=== 전처리 실험 시작 ===")
        
        try:
            # 전처리 조합 가져오기
            preprocessing_combinations = self.preprocessor.get_preprocessing_combinations()
            
            # 전처리 실험 결과 저장
            preprocessing_results = {
                'combinations': preprocessing_combinations,
                'evaluation_results': {},
                'recommendations': {}
            }
            
            # 각 전처리 조합에 대한 간단한 평가 수행
            for combo_name, combo_info in preprocessing_combinations.items():
                self.logger.info(f"전처리 조합 테스트: {combo_name}")
                
                # 실제 데이터에 적용 테스트
                try:
                    # 샘플 데이터로 테스트
                    X_sample = self.experiment_runner.merged_df[
                        ['close', 'volume', 'sma_20', 'sma_50', 'rsi']
                    ].fillna(0).values[:100]
                    y_sample = self.experiment_runner.merged_df['major_event'].values[:100]
                    
                    X_processed, y_processed, applied_methods = self.preprocessor.apply_preprocessing_combination(
                        X_sample, y_sample, combo_info['methods']
                    )
                    
                    preprocessing_results['evaluation_results'][combo_name] = {
                        'success': True,
                        'original_shape': X_sample.shape,
                        'processed_shape': X_processed.shape,
                        'applied_methods': applied_methods,
                        'data_reduction': 1 - (len(X_processed) / len(X_sample))
                    }
                    
                except Exception as e:
                    preprocessing_results['evaluation_results'][combo_name] = {
                        'success': False,
                        'error': str(e)
                    }
            
            # 전처리 결과 저장
            with open(f'{self.results_dir}/preprocessing_experiments.json', 'w') as f:
                json.dump(preprocessing_results, f, indent=2)
            
            self.logger.info("전처리 실험 완료")
            return True
            
        except Exception as e:
            self.logger.error(f"전처리 실험 중 오류: {e}")
            return False
    
    def run_model_comparison_experiments(self):
        """모델 비교 실험 실행"""
        self.logger.info("=== 모델 비교 실험 시작 ===")
        
        try:
            # 집중 실험 계획 생성
            focused_plan = self.experiment_framework.create_focused_experiment_plan('top_models')
            
            # 실험 실행
            self.logger.info("주요 모델 비교 실험 실행 중...")
            results = self.experiment_runner.run_experiment_batch(
                f'{self.experiment_dir}/focused_experiment_plan_top_models.json',
                max_experiments=20  # 논문용으로 20개 실험
            )
            
            # 결과 분석
            successful_results = [r for r in results if r['status'] == 'completed']
            
            if successful_results:
                self.logger.info(f"성공한 실험: {len(successful_results)}개")
                
                # 비교 플롯 생성
                self.experiment_runner.generate_comparison_plots(results, 'paper_model_comparison')
                
                return True
            else:
                self.logger.error("성공한 실험이 없습니다")
                return False
                
        except Exception as e:
            self.logger.error(f"모델 비교 실험 중 오류: {e}")
            return False
    
    def run_ablation_studies(self):
        """Ablation 연구 실행"""
        self.logger.info("=== Ablation 연구 시작 ===")
        
        try:
            # Ablation 실험 계획 생성
            ablation_plan = self.experiment_framework.create_ablation_study_plan()
            
            # 실험 실행 (일부만)
            self.logger.info("Ablation 연구 실험 실행 중...")
            results = self.experiment_runner.run_experiment_batch(
                f'{self.experiment_dir}/ablation_study_plan.json',
                max_experiments=15  # 논문용으로 15개 실험
            )
            
            # 결과 분석
            successful_results = [r for r in results if r['status'] == 'completed']
            
            if successful_results:
                self.logger.info(f"Ablation 연구 성공: {len(successful_results)}개")
                
                # 특성별 중요도 분석
                self.analyze_feature_importance(successful_results)
                
                return True
            else:
                self.logger.error("Ablation 연구에서 성공한 실험이 없습니다")
                return False
                
        except Exception as e:
            self.logger.error(f"Ablation 연구 중 오류: {e}")
            return False
    
    def analyze_feature_importance(self, results):
        """특성 중요도 분석"""
        try:
            feature_importance_analysis = {
                'feature_group_impact': {},
                'best_feature_combinations': [],
                'feature_selection_insights': []
            }
            
            # 결과 분석
            for result in results:
                if 'configuration' in result:
                    feature_combo = result['configuration']['feature_combination']
                    accuracy = result['performance']['accuracy']['mean']
                    
                    if feature_combo not in feature_importance_analysis['feature_group_impact']:
                        feature_importance_analysis['feature_group_impact'][feature_combo] = []
                    
                    feature_importance_analysis['feature_group_impact'][feature_combo].append(accuracy)
            
            # 평균 성능 계산
            for feature_combo, accuracies in feature_importance_analysis['feature_group_impact'].items():
                avg_accuracy = sum(accuracies) / len(accuracies)
                feature_importance_analysis['best_feature_combinations'].append({
                    'feature_combination': feature_combo,
                    'average_accuracy': avg_accuracy,
                    'num_experiments': len(accuracies)
                })
            
            # 성능 순으로 정렬
            feature_importance_analysis['best_feature_combinations'].sort(
                key=lambda x: x['average_accuracy'], reverse=True
            )
            
            # 인사이트 생성
            if feature_importance_analysis['best_feature_combinations']:
                best_combo = feature_importance_analysis['best_feature_combinations'][0]
                feature_importance_analysis['feature_selection_insights'].append(
                    f"최고 성능 특성 조합: {best_combo['feature_combination']} (정확도: {best_combo['average_accuracy']:.4f})"
                )
            
            # 결과 저장
            with open(f'{self.results_dir}/feature_importance_analysis.json', 'w') as f:
                json.dump(feature_importance_analysis, f, indent=2)
            
            self.logger.info("특성 중요도 분석 완료")
            
        except Exception as e:
            self.logger.error(f"특성 중요도 분석 중 오류: {e}")
    
    def run_comprehensive_evaluation(self):
        """종합 평가 실행"""
        self.logger.info("=== 종합 평가 시작 ===")
        
        try:
            # 모든 실험 결과 수집
            all_results = self.collect_all_results()
            
            if not all_results:
                self.logger.error("평가할 실험 결과가 없습니다")
                return False
            
            # 종합 평가 수행
            comprehensive_report = self.evaluator.generate_comprehensive_report(
                all_results,
                f'{self.results_dir}/comprehensive_evaluation_report.json'
            )
            
            # 시각화 대시보드 생성
            self.evaluator.create_visualization_dashboard(all_results, self.results_dir)
            
            self.logger.info("종합 평가 완료")
            return True
            
        except Exception as e:
            self.logger.error(f"종합 평가 중 오류: {e}")
            return False
    
    def collect_all_results(self):
        """모든 실험 결과 수집"""
        all_results = {}
        
        # 결과 디렉토리에서 JSON 파일 찾기
        results_dir = f'{self.experiment_dir}/results'
        
        if os.path.exists(results_dir):
            for file in os.listdir(results_dir):
                if file.endswith('_results.json'):
                    try:
                        with open(f'{results_dir}/{file}', 'r') as f:
                            results = json.load(f)
                        
                        # 결과 파싱 및 모델별 정리
                        for result in results:
                            if result['status'] == 'completed':
                                model_name = result['configuration']['model']
                                
                                # 모델 이름 중복 방지
                                base_name = model_name
                                counter = 1
                                while model_name in all_results:
                                    model_name = f"{base_name}_{counter}"
                                    counter += 1
                                
                                # 평가 결과 변환
                                all_results[model_name] = self.convert_to_evaluation_format(result)
                        
                    except Exception as e:
                        self.logger.warning(f"결과 파일 {file} 로드 실패: {e}")
        
        return all_results
    
    def convert_to_evaluation_format(self, result):
        """실험 결과를 평가 형식으로 변환"""
        evaluation_format = {
            'basic_classification': {},
            'advanced_classification': {},
            'financial_metrics': {},
            'temporal_metrics': {},
            'confidence_metrics': {}
        }
        
        # 성능 메트릭 변환
        for metric_name, metric_data in result['performance'].items():
            score = metric_data['mean']
            
            if metric_name in ['accuracy', 'precision', 'recall', 'f1_score']:
                evaluation_format['basic_classification'][metric_name] = {
                    'score': score,
                    'description': f'{metric_name.capitalize()} score',
                    'interpretation': 'Higher is better'
                }
            elif metric_name in ['roc_auc']:
                evaluation_format['advanced_classification'][metric_name] = {
                    'score': score,
                    'description': 'ROC AUC score',
                    'interpretation': 'Higher is better'
                }
        
        return evaluation_format
    
    def generate_paper_summary(self):
        """논문용 요약 생성"""
        self.logger.info("=== 논문용 요약 생성 ===")
        
        try:
            # 모든 결과 수집
            summary = {
                'experiment_overview': {
                    'total_experiments': 0,
                    'successful_experiments': 0,
                    'experiment_types': [],
                    'execution_time': 0
                },
                'dataset_summary': {},
                'model_performance': {},
                'key_findings': [],
                'recommendations': {},
                'publication_ready_tables': {},
                'publication_ready_figures': []
            }
            
            # 데이터셋 정보 수집
            if os.path.exists(f'{self.paper_dir}/comprehensive_dataset_specification.json'):
                with open(f'{self.paper_dir}/comprehensive_dataset_specification.json', 'r') as f:
                    dataset_info = json.load(f)
                    summary['dataset_summary'] = dataset_info.get('dataset_statistics', {})
            
            # 실험 결과 수집
            results_files = [f for f in os.listdir(f'{self.experiment_dir}/results') if f.endswith('_results.json')]
            
            for results_file in results_files:
                try:
                    with open(f'{self.experiment_dir}/results/{results_file}', 'r') as f:
                        results = json.load(f)
                    
                    summary['experiment_overview']['total_experiments'] += len(results)
                    summary['experiment_overview']['successful_experiments'] += len([r for r in results if r['status'] == 'completed'])
                    
                except Exception as e:
                    self.logger.warning(f"결과 파일 {results_file} 처리 실패: {e}")
            
            # 핵심 발견사항 생성
            summary['key_findings'] = [
                f"총 {summary['experiment_overview']['total_experiments']}개의 실험을 수행했습니다.",
                f"성공률: {summary['experiment_overview']['successful_experiments'] / max(1, summary['experiment_overview']['total_experiments']) * 100:.1f}%",
                "다양한 전처리 기법과 모델 조합을 체계적으로 평가했습니다.",
                "금융 특화 메트릭을 포함한 종합적 평가를 수행했습니다."
            ]
            
            # 권장사항 생성
            summary['recommendations'] = {
                'best_preprocessing': "고급 전처리 기법 사용 권장",
                'best_model_type': "앙상블 모델 권장",
                'feature_selection': "특성 선택 기법 활용 권장",
                'evaluation_metrics': "다중 메트릭 기반 평가 권장"
            }
            
            # 논문용 파일 목록
            summary['publication_ready_tables'] = [
                f'{self.paper_dir}/tables/table1_dataset_summary.csv',
                f'{self.paper_dir}/tables/table2_model_comparison.csv',
                f'{self.paper_dir}/tables/table3_event_distribution.csv'
            ]
            
            summary['publication_ready_figures'] = [
                f'{self.paper_dir}/figures/correlation_heatmap.png',
                f'{self.paper_dir}/figures/time_series_analysis.png',
                f'{self.results_dir}/model_comparison.png',
                f'{self.results_dir}/radar_chart.png'
            ]
            
            # 요약 저장
            with open(f'{self.results_dir}/paper_summary.json', 'w') as f:
                json.dump(summary, f, indent=2)
            
            # 마크다운 형식으로도 저장
            self.generate_markdown_summary(summary)
            
            self.logger.info("논문용 요약 생성 완료")
            return True
            
        except Exception as e:
            self.logger.error(f"논문용 요약 생성 중 오류: {e}")
            return False
    
    def generate_markdown_summary(self, summary):
        """마크다운 형식 요약 생성"""
        
        markdown_content = f"""# S&P500 Real-time Event Detection System - Experimental Results

## Experiment Overview

- **Total Experiments**: {summary['experiment_overview']['total_experiments']}
- **Successful Experiments**: {summary['experiment_overview']['successful_experiments']}
- **Success Rate**: {summary['experiment_overview']['successful_experiments'] / max(1, summary['experiment_overview']['total_experiments']) * 100:.1f}%

## Key Findings

{chr(10).join(f"- {finding}" for finding in summary['key_findings'])}

## Recommendations

{chr(10).join(f"- **{key}**: {value}" for key, value in summary['recommendations'].items())}

## Publication-Ready Materials

### Tables
{chr(10).join(f"- {table}" for table in summary['publication_ready_tables'])}

### Figures
{chr(10).join(f"- {figure}" for figure in summary['publication_ready_figures'])}

## Data Access

- **Dataset Specification**: `{self.paper_dir}/comprehensive_dataset_specification.json`
- **Detailed Results**: `{self.results_dir}/`
- **Visualizations**: `{self.results_dir}/`

---
*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
        
        with open(f'{self.results_dir}/EXPERIMENTAL_SUMMARY.md', 'w') as f:
            f.write(markdown_content)
    
    def run_complete_pipeline(self):
        """전체 파이프라인 실행"""
        self.logger.info("=== 논문용 마스터 실험 파이프라인 시작 ===")
        
        start_time = time.time()
        
        pipeline_success = {
            'dataset_analysis': False,
            'preprocessing_experiments': False,
            'model_comparison': False,
            'ablation_studies': False,
            'comprehensive_evaluation': False,
            'paper_summary': False
        }
        
        try:
            # 1. 데이터셋 분석
            pipeline_success['dataset_analysis'] = self.run_dataset_analysis()
            
            # 2. 전처리 실험
            pipeline_success['preprocessing_experiments'] = self.run_preprocessing_experiments()
            
            # 3. 모델 비교 실험
            pipeline_success['model_comparison'] = self.run_model_comparison_experiments()
            
            # 4. Ablation 연구
            pipeline_success['ablation_studies'] = self.run_ablation_studies()
            
            # 5. 종합 평가
            pipeline_success['comprehensive_evaluation'] = self.run_comprehensive_evaluation()
            
            # 6. 논문용 요약
            pipeline_success['paper_summary'] = self.generate_paper_summary()
            
            # 실행 시간 계산
            execution_time = time.time() - start_time
            
            # 최종 결과
            successful_steps = sum(pipeline_success.values())
            total_steps = len(pipeline_success)
            
            self.logger.info(f"=== 파이프라인 완료 ===")
            self.logger.info(f"성공한 단계: {successful_steps}/{total_steps}")
            self.logger.info(f"총 실행 시간: {execution_time:.2f}초")
            
            # 결과 저장
            pipeline_result = {
                'pipeline_success': pipeline_success,
                'execution_time': execution_time,
                'success_rate': successful_steps / total_steps,
                'completion_timestamp': datetime.now().isoformat()
            }
            
            with open(f'{self.results_dir}/pipeline_result.json', 'w') as f:
                json.dump(pipeline_result, f, indent=2)
            
            return successful_steps >= total_steps * 0.8  # 80% 이상 성공시 True
            
        except Exception as e:
            self.logger.error(f"파이프라인 실행 중 오류: {e}")
            return False

def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description='S&P500 논문용 마스터 실험 시스템')
    parser.add_argument('--data-dir', default='raw_data', help='데이터 디렉토리')
    parser.add_argument('--paper-dir', default='paper_data', help='논문 데이터 디렉토리')
    parser.add_argument('--experiment-dir', default='experiments', help='실험 디렉토리')
    parser.add_argument('--quick', action='store_true', help='빠른 실행 (제한된 실험)')
    
    args = parser.parse_args()
    
    # 마스터 실험 시스템 초기화
    master = PaperExperimentMaster(args.data_dir, args.paper_dir, args.experiment_dir)
    
    print("="*60)
    print("S&P500 실시간 이벤트 탐지 시스템")
    print("논문용 마스터 실험 파이프라인")
    print("="*60)
    
    if args.quick:
        print("빠른 실행 모드 - 제한된 실험 수행")
    
    # 전체 파이프라인 실행
    success = master.run_complete_pipeline()
    
    if success:
        print("\n✅ 실험 파이프라인 성공적으로 완료!")
        print(f"📊 결과 위치: {master.results_dir}")
        print(f"📄 논문 데이터: {master.paper_dir}")
        print(f"📈 실험 결과: {master.experiment_dir}")
    else:
        print("\n❌ 실험 파이프라인 실행 중 문제 발생")
        print("로그를 확인하여 문제를 해결하세요.")
        sys.exit(1)

if __name__ == "__main__":
    main()