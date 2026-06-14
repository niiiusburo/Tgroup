package com.tay.multilevelmarketingbrokerage;

import java.util.ArrayList;
import java.util.List;

public class Ladder {
	private List<LadderEntry> ladderEntryList= new ArrayList<LadderEntry>();
	public Ladder() {
		init();
	}
	
	private void init() {
		ladderEntryList.add(new LadderEntry(0,20000,0.60));
		ladderEntryList.add(new LadderEntry(20000,50000,0.65));
		ladderEntryList.add(new LadderEntry(50000,75000,0.70));
		ladderEntryList.add(new LadderEntry(75000,100000,0.75));
		ladderEntryList.add(new LadderEntry(100000,250000,0.80));
		ladderEntryList.add(new LadderEntry(250000,500000,0.85));
		ladderEntryList.add(new LadderEntry(500000,750000,0.90));
		ladderEntryList.add(new LadderEntry(750000,1000000,0.95));
		ladderEntryList.add(new LadderEntry(1000000,Integer.MAX_VALUE,1.00));
	}
	
	static class LadderEntry {
		double leftValue;
		double rightValue;
		double rate;
		public LadderEntry(long lValue, long rValue, double rt) {
			this.leftValue = lValue;
			this.rightValue = rValue;
			this.rate = rt;
		}
	}
	
	public LadderEntry getLadderEntry(double input) {
		for(LadderEntry lEntry : ladderEntryList) {
			if(input >= lEntry.leftValue && input<lEntry.rightValue) {
				return lEntry;
			}
		}
		return null;
	}
	
	public List<LadderEntry> getLadderEntryList(double input) {
		if(input < 0 || input > Integer.MAX_VALUE) {
			return null;
		}
		List<LadderEntry> retValue = new ArrayList<LadderEntry>();
		for(LadderEntry lEntry : ladderEntryList) {
			if((input > lEntry.rightValue) || (input >= lEntry.leftValue && input<lEntry.rightValue)) {
				retValue.add(lEntry);
			}
		}
		return retValue;
	}
	
	public double calculateBrokerage(double commissionChargeBase) {
		List<LadderEntry> leList = getLadderEntryList(commissionChargeBase);
		double brokerage = 0;
		double commissionCharge = commissionChargeBase;
		for(int i = leList.size()-1;i>=0;i--) {
			LadderEntry le = leList.get(i);
			brokerage = brokerage + (commissionCharge - le.leftValue)*le.rate;
			commissionCharge = le.leftValue;
		}
		
		return brokerage;
	}
}
