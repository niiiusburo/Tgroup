package com.tay.multilevelmarketingbrokerage;

import java.util.HashSet;

public class Market {
	
	public static final double CommissionChargeBaseRate = 2.0/3;
	
	
	public static void prepare(Member member, HashSet<String> set) {
		if(set.contains(member.getId())) {
			throw new RuntimeException("The member tree includes circle!");
		}
		else {
			set.add(member.getId());
		}
		if(member.getChildren().size() == 0) {
			member.setSubTreeCommissionCharge(member.getCommissionCharge());
			return;
		}
		else {
			member.setSubTreeCommissionCharge(member.getCommissionCharge());
			for(Member child : member.getChildren()) {
				prepare(child, set);
				member.addSubTreeCommissionCharge(child.getSubTreeCommissionCharge());
			}
		}
	}
	
	
	public static double calculateCommission(Member member, Ladder ladder) {
		double val = 0;
		double commissionChargeBase =  member.getSubTreeCommissionCharge() * CommissionChargeBaseRate;
		if(member.getChildren().size() == 0) {
			val = ladder.calculateBrokerage(commissionChargeBase);
			member.setBrokerage(val);
			if(member.getParent() != null) {
				member.getParent().addDescendantsBrokerage(val);
			}
			return val;
		}
		else {
			double totalBrokerage = ladder.calculateBrokerage(commissionChargeBase);
			double memberBrokerage = totalBrokerage;
			for(Member child : member.getChildren()) {
				double childBrokerage = calculateCommission(child, ladder);
				memberBrokerage = memberBrokerage - childBrokerage - child.getDescendantsBrokerage();
			}
			member.setBrokerage(memberBrokerage);
			if(member.getParent() != null) {
				member.getParent().addDescendantsBrokerage(memberBrokerage+member.getDescendantsBrokerage());
			}
			return memberBrokerage;
		}
	}
}
