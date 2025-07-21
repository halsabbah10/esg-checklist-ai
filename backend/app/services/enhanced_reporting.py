"""
Enhanced reporting service for comprehensive ESG checklist analysis summaries
Works alongside existing export functionality to provide additional reporting capabilities
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_session
from ..models import AIResult, AnalysisHistory, EmailNotificationLog, PerformanceMetrics, Submission, User, Checklist

logger = logging.getLogger(__name__)


class EnhancedReportingService:
    """Service for generating comprehensive reports and analytics"""

    def __init__(self, db: Session):
        self.db = db

    def generate_executive_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        department: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate executive summary report for stakeholders
        
        Returns:
            Comprehensive summary with key metrics and trends
        """
        try:
            # Default to last 30 days if no dates provided
            if not end_date:
                end_date = datetime.now(timezone.utc)
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            # Get analysis results within date range
            query = self.db.query(AIResult).filter(
                AIResult.created_at >= start_date,
                AIResult.created_at <= end_date
            )
            
            if department:
                # Filter by department if specified
                query = query.filter(
                    AIResult.metadata.contains(f'"department": "{department}"')
                )
            
            analyses = query.all()
            
            # Calculate key metrics
            total_analyses = len(analyses)
            
            if total_analyses == 0:
                return {
                    "period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "days": (end_date - start_date).days
                    },
                    "summary": {
                        "total_analyses": 0,
                        "message": "No analyses found for the specified period"
                    }
                }
            
            # Extract completeness data
            completeness_data = []
            category_scores = {"environmental": [], "social": [], "governance": []}
            overall_scores = []
            
            for analysis in analyses:
                if analysis.score is not None:
                    overall_scores.append(analysis.score)
                
                if analysis.metadata:
                    metadata = analysis.metadata
                    
                    # Extract completeness information
                    completeness = metadata.get("checklist_completeness", {})
                    if completeness:
                        completeness_data.append({
                            "filename": analysis.filename or "Unknown",
                            "total_questions": completeness.get("total", 0),
                            "completion_rate": completeness.get("completion_rate", 0),
                            "complete_count": completeness.get("summary", {}).get("complete", 0),
                            "incomplete_count": completeness.get("summary", {}).get("incomplete", 0),
                            "missing_count": completeness.get("summary", {}).get("missing", 0)
                        })
                    
                    # Extract category scores
                    cat_scores = metadata.get("category_scores", {})
                    for category in ["environmental", "social", "governance"]:
                        if cat_scores.get(category) is not None:
                            category_scores[category].append(cat_scores[category])
            
            # Calculate aggregated metrics
            avg_overall_score = sum(overall_scores) / len(overall_scores) if overall_scores else 0
            avg_completion_rate = sum(c["completion_rate"] for c in completeness_data) / len(completeness_data) if completeness_data else 0
            
            avg_category_scores = {}
            for category, scores in category_scores.items():
                avg_category_scores[category] = sum(scores) / len(scores) if scores else 0
            
            # Analyze trends (compare with previous period)
            previous_start = start_date - (end_date - start_date)
            previous_analyses = self.db.query(AIResult).filter(
                AIResult.created_at >= previous_start,
                AIResult.created_at < start_date
            ).all()
            
            previous_avg_score = 0
            if previous_analyses:
                previous_scores = [a.score for a in previous_analyses if a.score is not None]
                previous_avg_score = sum(previous_scores) / len(previous_scores) if previous_scores else 0
            
            score_trend = "improved" if avg_overall_score > previous_avg_score else "declined" if avg_overall_score < previous_avg_score else "stable"
            
            # Identify top performing and needs attention
            sorted_completeness = sorted(completeness_data, key=lambda x: x["completion_rate"], reverse=True)
            top_performers = sorted_completeness[:5]
            needs_attention = sorted(completeness_data, key=lambda x: x["completion_rate"])[:5]
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                avg_completion_rate, avg_overall_score, avg_category_scores, completeness_data
            )
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": (end_date - start_date).days,
                    "department": department
                },
                "summary": {
                    "total_analyses": total_analyses,
                    "average_overall_score": round(avg_overall_score, 3),
                    "average_completion_rate": round(avg_completion_rate * 100, 1),
                    "score_trend": score_trend,
                    "previous_period_score": round(previous_avg_score, 3)
                },
                "category_performance": {
                    "environmental": {
                        "average_score": round(avg_category_scores["environmental"], 3),
                        "analyses_count": len(category_scores["environmental"])
                    },
                    "social": {
                        "average_score": round(avg_category_scores["social"], 3),
                        "analyses_count": len(category_scores["social"])
                    },
                    "governance": {
                        "average_score": round(avg_category_scores["governance"], 3),
                        "analyses_count": len(category_scores["governance"])
                    }
                },
                "completeness_analysis": {
                    "total_questions_analyzed": sum(c["total_questions"] for c in completeness_data),
                    "average_questions_per_checklist": round(
                        sum(c["total_questions"] for c in completeness_data) / len(completeness_data), 1
                    ) if completeness_data else 0,
                    "total_complete_answers": sum(c["complete_count"] for c in completeness_data),
                    "total_incomplete_answers": sum(c["incomplete_count"] for c in completeness_data),
                    "total_missing_answers": sum(c["missing_count"] for c in completeness_data)
                },
                "top_performers": top_performers,
                "needs_attention": needs_attention,
                "recommendations": recommendations,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate executive summary: {e}")
            raise

    def generate_brd_compliance_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Generate BRD-compliant ESG review cycle summary report
        
        Returns:
            Comprehensive review cycle summary as specified in BRD
        """
        try:
            if not end_date:
                end_date = datetime.now(timezone.utc)
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            # Get all analyses in the review cycle
            analyses = self.db.query(AIResult).filter(
                AIResult.created_at >= start_date,
                AIResult.created_at <= end_date
            ).all()
            
            # Calculate BRD-specific metrics
            files_checked = len(analyses)
            completed_audits = 0
            incomplete_audits = 0
            missing_audits = 0
            
            audit_teams = {}
            validation_results = {
                "high_quality": 0,
                "medium_quality": 0,
                "low_quality": 0,
                "total_validated": 0
            }
            
            notifications_sent = {
                "incomplete_notifications": 0,
                "missing_notifications": 0,
                "total_notifications": 0
            }
            
            for analysis in analyses:
                if analysis.metadata:
                    completeness = analysis.metadata.get("checklist_completeness", {})
                    completion_rate = completeness.get("completion_rate", 0)
                    
                    # Classify audit status based on BRD requirements
                    if completion_rate >= 0.9:
                        completed_audits += 1
                        status = "complete"
                    elif completion_rate >= 0.5:
                        incomplete_audits += 1
                        status = "incomplete"
                    else:
                        missing_audits += 1
                        status = "missing"
                    
                    # Track audit team performance
                    dept_context = analysis.metadata.get("department_context", {})
                    team_name = dept_context.get("name", "Unknown Team")
                    
                    if team_name not in audit_teams:
                        audit_teams[team_name] = {
                            "team_name": team_name,
                            "submitted_files": 0,
                            "completed_files": 0,
                            "incomplete_files": 0,
                            "missing_files": 0,
                            "avg_quality_score": 0,
                            "total_quality_scores": [],
                            "notification_count": 0
                        }
                    
                    audit_teams[team_name]["submitted_files"] += 1
                    audit_teams[team_name][f"{status}_files"] += 1
                    
                    # Track quality validation results
                    quality_score = analysis.metadata.get("quality_score", analysis.score)
                    if quality_score:
                        audit_teams[team_name]["total_quality_scores"].append(quality_score)
                        validation_results["total_validated"] += 1
                        
                        if quality_score >= 0.8:
                            validation_results["high_quality"] += 1
                        elif quality_score >= 0.6:
                            validation_results["medium_quality"] += 1
                        else:
                            validation_results["low_quality"] += 1
                    
                    # Count notifications from metadata
                    email_notifications = analysis.metadata.get("email_notifications", [])
                    for notification in email_notifications:
                        if notification.get("type") == "incomplete_checklist":
                            notifications_sent["incomplete_notifications"] += 1
                            audit_teams[team_name]["notification_count"] += 1
                        elif notification.get("type") == "missing_submission":
                            notifications_sent["missing_notifications"] += 1
            
            # Calculate team averages
            for team_data in audit_teams.values():
                if team_data["total_quality_scores"]:
                    team_data["avg_quality_score"] = sum(team_data["total_quality_scores"]) / len(team_data["total_quality_scores"])
                del team_data["total_quality_scores"]  # Remove temp field
            
            notifications_sent["total_notifications"] = notifications_sent["incomplete_notifications"] + notifications_sent["missing_notifications"]
            
            # Calculate cycle completion time (average processing time)
            avg_processing_time = 0
            if analyses:
                total_processing_time = sum(a.processing_time_ms for a in analyses if a.processing_time_ms)
                avg_processing_time = total_processing_time / len(analyses) if analyses else 0
            
            return {
                "review_cycle_id": f"cycle_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}",
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": (end_date - start_date).days
                },
                "summary": {
                    "files_checked": files_checked,
                    "completed_audits": completed_audits,
                    "incomplete_audits": incomplete_audits,
                    "missing_audits": missing_audits,
                    "completion_rate": round((completed_audits / files_checked * 100) if files_checked > 0 else 0, 1)
                },
                "audit_teams": list(audit_teams.values()),
                "validation_results": validation_results,
                "cycle_completion_time": round(avg_processing_time, 2),
                "notifications_sent": notifications_sent,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate BRD compliance summary: {e}")
            raise

    def generate_compliance_dashboard_data(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Generate data for compliance dashboard visualization
        
        Returns:
            Data optimized for dashboard charts and KPIs
        """
        try:
            if not end_date:
                end_date = datetime.now(timezone.utc)
            if not start_date:
                start_date = end_date - timedelta(days=90)  # Last 3 months
            
            # Get analyses grouped by week
            analyses = self.db.query(AIResult).filter(
                AIResult.created_at >= start_date,
                AIResult.created_at <= end_date
            ).order_by(AIResult.created_at).all()
            
            # Group by week for trend analysis
            weekly_data = {}
            compliance_levels = {"high": 0, "medium": 0, "low": 0}
            department_performance = {}
            
            for analysis in analyses:
                # Get week key
                week_start = analysis.created_at.replace(
                    hour=0, minute=0, second=0, microsecond=0
                ) - timedelta(days=analysis.created_at.weekday())
                week_key = week_start.strftime("%Y-%W")
                
                if week_key not in weekly_data:
                    weekly_data[week_key] = {
                        "week_start": week_start.isoformat(),
                        "analyses_count": 0,
                        "total_score": 0,
                        "completion_rates": []
                    }
                
                weekly_data[week_key]["analyses_count"] += 1
                if analysis.score is not None:
                    weekly_data[week_key]["total_score"] += analysis.score
                
                # Extract completion rate and department
                if analysis.metadata:
                    completeness = analysis.metadata.get("checklist_completeness", {})
                    completion_rate = completeness.get("completion_rate", 0)
                    weekly_data[week_key]["completion_rates"].append(completion_rate)
                    
                    # Compliance level classification
                    if completion_rate >= 0.9:
                        compliance_levels["high"] += 1
                    elif completion_rate >= 0.7:
                        compliance_levels["medium"] += 1
                    else:
                        compliance_levels["low"] += 1
                    
                    # Department performance tracking
                    dept_context = analysis.metadata.get("department_context", {})
                    dept_name = dept_context.get("name", "Unknown") if dept_context else "Unknown"
                    
                    if dept_name not in department_performance:
                        department_performance[dept_name] = {
                            "analyses_count": 0,
                            "total_score": 0,
                            "completion_rates": []
                        }
                    
                    department_performance[dept_name]["analyses_count"] += 1
                    if analysis.score is not None:
                        department_performance[dept_name]["total_score"] += analysis.score
                    department_performance[dept_name]["completion_rates"].append(completion_rate)
            
            # Calculate weekly averages
            weekly_trends = []
            for week_key, data in sorted(weekly_data.items()):
                avg_score = data["total_score"] / data["analyses_count"] if data["analyses_count"] > 0 else 0
                avg_completion = sum(data["completion_rates"]) / len(data["completion_rates"]) if data["completion_rates"] else 0
                
                weekly_trends.append({
                    "week": week_key,
                    "week_start": data["week_start"],
                    "analyses_count": data["analyses_count"],
                    "average_score": round(avg_score, 3),
                    "average_completion_rate": round(avg_completion * 100, 1)
                })
            
            # Calculate department averages
            department_summary = []
            for dept_name, data in department_performance.items():
                avg_score = data["total_score"] / data["analyses_count"] if data["analyses_count"] > 0 else 0
                avg_completion = sum(data["completion_rates"]) / len(data["completion_rates"]) if data["completion_rates"] else 0
                
                department_summary.append({
                    "department": dept_name,
                    "analyses_count": data["analyses_count"],
                    "average_score": round(avg_score, 3),
                    "average_completion_rate": round(avg_completion * 100, 1),
                    "performance_grade": self._calculate_performance_grade(avg_score, avg_completion)
                })
            
            # Sort departments by performance
            department_summary.sort(key=lambda x: x["average_score"], reverse=True)
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "kpis": {
                    "total_analyses": len(analyses),
                    "compliance_distribution": compliance_levels,
                    "overall_compliance_rate": round(
                        (compliance_levels["high"] + compliance_levels["medium"]) / 
                        max(1, sum(compliance_levels.values())) * 100, 1
                    )
                },
                "trends": {
                    "weekly_data": weekly_trends,
                    "trend_direction": self._calculate_trend_direction(weekly_trends)
                },
                "departments": department_summary,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate compliance dashboard data: {e}")
            raise

    def generate_missing_submissions_report(
        self,
        target_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Generate missing submissions alert report for Advisory team
        
        Returns:
            Report of missing ESG checklist submissions
        """
        try:
            if not target_date:
                target_date = datetime.now(timezone.utc)
            
            # Get all expected submissions (this would need to be configured based on audit schedule)
            # For now, we'll identify missing submissions based on recent activity patterns
            
            # Get users who should have submitted but haven't
            recent_submitters = self.db.query(AIResult.user_id).filter(
                AIResult.created_at >= target_date - timedelta(days=30)
            ).distinct().all()
            
            # Get all active users
            all_users = self.db.query(User).filter(
                User.is_active == True
            ).all()
            
            missing_submissions = []
            overdue_submissions = []
            
            for user in all_users:
                # Check if user has submitted in the current cycle
                recent_submission = self.db.query(AIResult).filter(
                    AIResult.user_id == user.id,
                    AIResult.created_at >= target_date - timedelta(days=7)
                ).first()
                
                if not recent_submission:
                    # Check if user has any historical submissions
                    has_historical = self.db.query(AIResult).filter(
                        AIResult.user_id == user.id
                    ).first()
                    
                    if has_historical:
                        overdue_submissions.append({
                            "user_id": user.id,
                            "username": user.username,
                            "email": user.email,
                            "last_submission": has_historical.created_at.isoformat() if has_historical else None,
                            "days_overdue": (target_date - has_historical.created_at).days if has_historical else None
                        })
                    else:
                        missing_submissions.append({
                            "user_id": user.id,
                            "username": user.username,
                            "email": user.email,
                            "status": "never_submitted"
                        })
            
            return {
                "report_date": target_date.isoformat(),
                "summary": {
                    "total_expected": len(all_users),
                    "submitted": len(recent_submitters),
                    "missing": len(missing_submissions),
                    "overdue": len(overdue_submissions),
                    "compliance_rate": round((len(recent_submitters) / len(all_users) * 100) if all_users else 0, 1)
                },
                "missing_submissions": missing_submissions,
                "overdue_submissions": overdue_submissions,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate missing submissions report: {e}")
            raise

    def generate_audit_readiness_report(
        self,
        target_compliance_rate: float = 0.9
    ) -> Dict[str, Any]:
        """
        Generate audit readiness assessment based on recent analyses
        
        Args:
            target_compliance_rate: Target completion rate for audit readiness
            
        Returns:
            Audit readiness assessment with action items
        """
        try:
            # Get recent analyses (last 60 days)
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=60)
            recent_analyses = self.db.query(AIResult).filter(
                AIResult.created_at >= cutoff_date
            ).all()
            
            if not recent_analyses:
                return {
                    "audit_readiness": "insufficient_data",
                    "message": "Insufficient recent data for audit readiness assessment",
                    "recommendations": ["Conduct ESG checklist analyses to assess audit readiness"]
                }
            
            # Assess readiness by category
            readiness_assessment = {
                "overall": {"ready": 0, "needs_work": 0, "not_ready": 0},
                "environmental": {"ready": 0, "needs_work": 0, "not_ready": 0},
                "social": {"ready": 0, "needs_work": 0, "not_ready": 0},
                "governance": {"ready": 0, "needs_work": 0, "not_ready": 0}
            }
            
            critical_gaps = []
            action_items = []
            
            for analysis in recent_analyses:
                if not analysis.metadata:
                    continue
                
                completeness = analysis.metadata.get("checklist_completeness", {})
                completion_rate = completeness.get("completion_rate", 0)
                
                # Overall readiness classification
                if completion_rate >= target_compliance_rate:
                    readiness_assessment["overall"]["ready"] += 1
                elif completion_rate >= 0.7:
                    readiness_assessment["overall"]["needs_work"] += 1
                else:
                    readiness_assessment["overall"]["not_ready"] += 1
                
                # Category-specific assessment
                category_scores = analysis.metadata.get("category_scores", {})
                for category in ["environmental", "social", "governance"]:
                    score = category_scores.get(category, 0)
                    if score >= 0.8:
                        readiness_assessment[category]["ready"] += 1
                    elif score >= 0.6:
                        readiness_assessment[category]["needs_work"] += 1
                    else:
                        readiness_assessment[category]["not_ready"] += 1
                
                # Identify critical gaps
                if completion_rate < 0.5:
                    critical_gaps.append({
                        "file": analysis.filename or "Unknown",
                        "completion_rate": round(completion_rate * 100, 1),
                        "critical_areas": self._identify_critical_areas(analysis.metadata)
                    })
            
            # Calculate readiness percentages
            total_analyses = len(recent_analyses)
            overall_readiness_rate = readiness_assessment["overall"]["ready"] / total_analyses
            
            # Generate action items based on assessment
            if overall_readiness_rate < 0.7:
                action_items.extend([
                    "Immediate focus needed on ESG compliance improvements",
                    "Conduct comprehensive gap analysis across all categories",
                    "Establish remediation timeline for critical deficiencies"
                ])
            elif overall_readiness_rate < 0.9:
                action_items.extend([
                    "Address remaining compliance gaps before audit",
                    "Strengthen documentation for incomplete areas",
                    "Conduct final review of all ESG processes"
                ])
            else:
                action_items.extend([
                    "Maintain current compliance levels",
                    "Prepare final documentation package",
                    "Conduct pre-audit quality check"
                ])
            
            # Determine overall readiness status
            if overall_readiness_rate >= 0.9:
                readiness_status = "audit_ready"
            elif overall_readiness_rate >= 0.7:
                readiness_status = "needs_improvement"
            else:
                readiness_status = "not_ready"
            
            return {
                "audit_readiness": readiness_status,
                "assessment_date": datetime.now(timezone.utc).isoformat(),
                "target_compliance_rate": target_compliance_rate,
                "overall_readiness_rate": round(overall_readiness_rate * 100, 1),
                "analyses_reviewed": total_analyses,
                "readiness_breakdown": readiness_assessment,
                "critical_gaps": critical_gaps[:10],  # Top 10 most critical
                "action_items": action_items,
                "recommendations": self._generate_audit_readiness_recommendations(
                    readiness_status, readiness_assessment
                )
            }
            
        except Exception as e:
            logger.error(f"Failed to generate audit readiness report: {e}")
            raise

    def _generate_recommendations(
        self,
        avg_completion_rate: float,
        avg_overall_score: float,
        category_scores: Dict[str, float],
        completeness_data: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        recommendations = []
        
        if avg_completion_rate < 0.8:
            recommendations.append(
                "Focus on improving checklist completion rates - currently below 80%"
            )
        
        if avg_overall_score < 0.7:
            recommendations.append(
                "Overall ESG performance needs improvement - implement targeted action plans"
            )
        
        # Category-specific recommendations
        lowest_category = min(category_scores.items(), key=lambda x: x[1])
        if lowest_category[1] < 0.6:
            recommendations.append(
                f"Priority focus needed on {lowest_category[0]} category - lowest performing area"
            )
        
        # Check for consistency issues
        completion_rates = [c["completion_rate"] for c in completeness_data]
        if completion_rates:
            rate_variance = max(completion_rates) - min(completion_rates)
            if rate_variance > 0.5:
                recommendations.append(
                    "High variance in completion rates across analyses - standardize processes"
                )
        
        return recommendations

    def _calculate_performance_grade(self, score: float, completion_rate: float) -> str:
        """Calculate performance grade based on score and completion rate"""
        combined_score = (score * 0.6) + (completion_rate * 0.4)
        
        if combined_score >= 0.9:
            return "A"
        elif combined_score >= 0.8:
            return "B"
        elif combined_score >= 0.7:
            return "C"
        elif combined_score >= 0.6:
            return "D"
        else:
            return "F"

    def _calculate_trend_direction(self, weekly_trends: List[Dict[str, Any]]) -> str:
        """Calculate overall trend direction from weekly data"""
        if len(weekly_trends) < 2:
            return "insufficient_data"
        
        recent_weeks = weekly_trends[-4:]  # Last 4 weeks
        older_weeks = weekly_trends[:-4] if len(weekly_trends) > 4 else weekly_trends[:1]
        
        recent_avg = sum(w["average_score"] for w in recent_weeks) / len(recent_weeks)
        older_avg = sum(w["average_score"] for w in older_weeks) / len(older_weeks)
        
        if recent_avg > older_avg * 1.05:
            return "improving"
        elif recent_avg < older_avg * 0.95:
            return "declining"
        else:
            return "stable"

    def _identify_critical_areas(self, metadata: Dict[str, Any]) -> List[str]:
        """Identify critical areas needing attention"""
        critical_areas = []
        
        completeness = metadata.get("checklist_completeness", {})
        items = completeness.get("items", [])
        
        missing_items = [item for item in items if item.get("status", "").lower() == "missing"]
        if len(missing_items) > 5:
            critical_areas.append("Multiple missing responses")
        
        category_scores = metadata.get("category_scores", {})
        for category, score in category_scores.items():
            if score < 0.5:
                critical_areas.append(f"Low {category} performance")
        
        return critical_areas

    def _generate_audit_readiness_recommendations(
        self,
        readiness_status: str,
        readiness_breakdown: Dict[str, Any]
    ) -> List[str]:
        """Generate specific recommendations for audit readiness"""
        recommendations = []
        
        if readiness_status == "not_ready":
            recommendations.extend([
                "Implement immediate ESG compliance improvement program",
                "Assign dedicated resources to address critical gaps",
                "Establish weekly progress monitoring",
                "Consider postponing audit until minimum 70% readiness achieved"
            ])
        elif readiness_status == "needs_improvement":
            recommendations.extend([
                "Focus on completing remaining checklist items",
                "Enhance documentation for partially complete areas",
                "Conduct internal pre-audit assessment",
                "Target 90% completion rate before external audit"
            ])
        else:
            recommendations.extend([
                "Maintain current compliance standards",
                "Prepare comprehensive documentation package",
                "Conduct final quality assurance review",
                "Brief audit team on current ESG performance"
            ])
        
        return recommendations


def get_enhanced_reporting_service(db: Session = None) -> EnhancedReportingService:
    """Get enhanced reporting service instance"""
    if db is None:
        db = next(get_session())
    return EnhancedReportingService(db)