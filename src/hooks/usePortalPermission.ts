"use client";
import {createContext,useContext} from "react";
import type {AppRole} from "@/src/core/contracts/auth";
import {hasPermission,type Permission} from "@/src/core/domain/permissions";
export const PortalAccessContext=createContext<AppRole[]|null>(null);
export function usePortalPermission(permission:Permission){return hasPermission(useContext(PortalAccessContext)||[],permission)}
