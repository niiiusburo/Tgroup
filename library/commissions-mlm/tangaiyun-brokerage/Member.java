package com.tay.multilevelmarketingbrokerage;

import java.util.ArrayList;
import java.util.List;

public class Member {
	private String id;
	private Member parent = null;
	private List<Member> children = new ArrayList<Member>();
	public Member(String id, Member p, List<Member> children) {
		this.id = id;
		this.parent = p;
		this.children = children;
	}
	public Member(String id, Member p) {
		this.id = id;
		this.parent = p;
	}
	public Member(String id) {
		this.id = id;
	}
	//手续费
	private volatile double commissionCharge;
	//子树上所有手续费
	private volatile double subTreeCommissionCharge;
	//佣金
	private volatile double brokerage;
	//子会员佣金
	private volatile double descendantsBrokerage;
	
	public String getId() {
		return id;
	}
	
	public Member getParent() {
		return parent;
	}
	
	public void setParent(Member parent) {
		this.parent = parent;
	}
	
	public double getCommissionCharge() {
		return commissionCharge;
	}
	
	public void setCommissionCharge(double commissionCharge) {
		this.commissionCharge = commissionCharge;
	}
	
	public List<Member> getChildren() {
		return children;
	}
	
	public double getBrokerage() {
		return brokerage;
	}
	
	public void setBrokerage(double brokerage) {
		this.brokerage = brokerage;
	}
	
	public void addChild(Member child) {
		children.add(child);
	}
	public void addDescendantsBrokerage(double value) {
		descendantsBrokerage = descendantsBrokerage + value;
	}
	
	public double getDescendantsBrokerage() {
		return descendantsBrokerage;
	}
	public void setDescendantsBrokerage(double value) {
		descendantsBrokerage = value;
	}
	public double getSubTreeCommissionCharge() {
		return subTreeCommissionCharge;
	}
	public void setSubTreeCommissionCharge(double subTreeCommissionCharge) {
		this.subTreeCommissionCharge = subTreeCommissionCharge;
	}
	
	public void addSubTreeCommissionCharge(double value) {
		subTreeCommissionCharge = subTreeCommissionCharge + value;
	}
}
